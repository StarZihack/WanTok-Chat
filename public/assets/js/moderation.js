// moderation.js - Sightengine AI Moderation for WanTok Video Chat
// Handles nudity detection, minor safety, and content moderation

const ModerationModule = (function() {
  'use strict';

  // Sightengine API Credentials
  const API_USER = '1797007053';
  const API_SECRET = 'xMwbARPmessMzHXhRzChnFH3WUh8A9gE';
  const API_ENDPOINT = 'https://api.sightengine.com/1.0/check.json';

  // Moderation thresholds (0-1 scale, lower = safer)
  const THRESHOLDS = {
    nudity: 0.8,        // Block if nudity score > 0.8
    weapon: 0.7,        // Block if weapon detected > 0.7
    drugs: 0.7,         // Block if drugs/alcohol > 0.7
    minorRisk: 0.5      // Very strict threshold for minor-related content
  };

  // Track moderation checks to stay within free tier limits
  let moderationCheckCount = 0;
  const MAX_FREE_CHECKS = 2; // 2 checks per connection (free tier limit)

  /**
   * Capture a single frame from a video element as a base64 image
   * @param {HTMLVideoElement} videoElement - The video element to capture from
   * @returns {Promise<string>} Base64-encoded image data
   */
  function captureVideoFrame(videoElement) {
    return new Promise((resolve, reject) => {
      try {
        if (!videoElement || videoElement.readyState < 2) {
          reject(new Error('Video not ready for capture'));
          return;
        }

        // Create canvas to capture frame
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // Convert to base64 (JPEG format, 80% quality)
        const base64Image = canvas.toDataURL('image/jpeg', 0.8);
        resolve(base64Image);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send image to Sightengine API for moderation check
   * @param {string} base64Image - Base64-encoded image
   * @param {string} checkType - Type of check: 'nudity', 'weapon', 'all'
   * @returns {Promise<Object>} API response with moderation results
   */
  async function checkImageWithSightengine(base64Image, checkType = 'all') {
    try {
      // Remove data URL prefix if present
      const imageData = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

      // Build API request parameters
      const formData = new FormData();
      formData.append('media', imageData);
      formData.append('api_user', API_USER);
      formData.append('api_secret', API_SECRET);

      // Set models to check based on type
      if (checkType === 'nudity' || checkType === 'all') {
        formData.append('models', 'nudity-2.0,wad,offensive');
      } else if (checkType === 'weapon') {
        formData.append('models', 'wad');
      }

      // Send request to Sightengine
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Sightengine API error: ${response.status}`);
      }

      const result = await response.json();
      moderationCheckCount++;

      console.log('[Moderation] Sightengine check complete:', result);
      return result;

    } catch (error) {
      console.error('[Moderation] Sightengine API error:', error);
      throw error;
    }
  }

  /**
   * Analyze Sightengine results and determine if content is unsafe
   * @param {Object} apiResult - Response from Sightengine API
   * @returns {Object} {isSafe: boolean, reason: string, scores: object}
   */
  function analyzeModeractionResults(apiResult) {
    const analysis = {
      isSafe: true,
      reason: '',
      scores: {},
      details: []
    };

    // Check nudity (highest priority - potential minor risk)
    if (apiResult.nudity) {
      const nudityScore = Math.max(
        apiResult.nudity.sexual_activity || 0,
        apiResult.nudity.sexual_display || 0,
        apiResult.nudity.erotica || 0,
        apiResult.nudity.suggestive || 0
      );

      analysis.scores.nudity = nudityScore;

      if (nudityScore > THRESHOLDS.nudity) {
        analysis.isSafe = false;
        analysis.reason = 'Nudity or sexually explicit content detected';
        analysis.details.push(`Nudity score: ${(nudityScore * 100).toFixed(1)}%`);
      }

      // Extra strict check for potential minor-involved content
      // If nudity is detected AND raw nudity score is moderate, flag as high risk
      if (nudityScore > THRESHOLDS.minorRisk && apiResult.nudity.raw) {
        const rawNudityScore = Math.max(
          apiResult.nudity.raw || 0,
          apiResult.nudity.partial || 0
        );

        if (rawNudityScore > THRESHOLDS.minorRisk) {
          analysis.isSafe = false;
          analysis.reason = 'Potentially unsafe content detected (minor protection)';
          analysis.details.push('Content flagged for manual review');
        }
      }
    }

    // Check weapons and alcohol/drugs (optional)
    if (apiResult.weapon) {
      const weaponScore = apiResult.weapon;
      analysis.scores.weapon = weaponScore;

      if (weaponScore > THRESHOLDS.weapon) {
        analysis.isSafe = false;
        analysis.reason = 'Weapon detected in video';
        analysis.details.push(`Weapon detection: ${(weaponScore * 100).toFixed(1)}%`);
      }
    }

    if (apiResult.alcohol) {
      const alcoholScore = apiResult.alcohol;
      analysis.scores.alcohol = alcoholScore;

      if (alcoholScore > THRESHOLDS.drugs) {
        analysis.isSafe = false;
        analysis.reason = 'Alcohol/drugs detected in video';
        analysis.details.push(`Substance detection: ${(alcoholScore * 100).toFixed(1)}%`);
      }
    }

    // Check offensive content
    if (apiResult.offensive) {
      const offensiveScore = Math.max(
        apiResult.offensive.prob || 0
      );
      analysis.scores.offensive = offensiveScore;

      if (offensiveScore > 0.8) {
        analysis.isSafe = false;
        analysis.reason = 'Offensive content detected';
        analysis.details.push(`Offensive score: ${(offensiveScore * 100).toFixed(1)}%`);
      }
    }

    return analysis;
  }

  /**
   * Moderate a user's video stream on connection
   * @param {HTMLVideoElement} videoElement - User's video element
   * @param {string} userId - User ID for logging
   * @returns {Promise<Object>} Moderation result
   */
  async function moderateOnConnect(videoElement, userId) {
    console.log(`[Moderation] Checking user ${userId} on connect...`);

    try {
      // Check if we've exceeded free tier limit
      if (moderationCheckCount >= MAX_FREE_CHECKS) {
        console.warn('[Moderation] Free tier limit reached, skipping automated check');
        return { isSafe: true, reason: 'Limit reached' };
      }

      // Wait a moment for video to stabilize (optional)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Capture frame from video
      const frame = await captureVideoFrame(videoElement);

      // Send to Sightengine for analysis
      const apiResult = await checkImageWithSightengine(frame, 'all');

      // Analyze results
      const analysis = analyzeModeractionResults(apiResult);

      // Log result
      console.log(`[Moderation] User ${userId} check complete:`, analysis);

      // If unsafe, take action
      if (!analysis.isSafe) {
        await handleUnsafeContent(userId, analysis.reason, 'auto-detection');
      }

      return analysis;

    } catch (error) {
      console.error(`[Moderation] Error checking user ${userId}:`, error);
      // Don't block on error (fail open for better UX)
      return { isSafe: true, reason: 'Check failed', error: error.message };
    }
  }

  /**
   * Handle user report with optional AI moderation
   * @param {HTMLVideoElement} reportedUserVideo - Reported user's video element
   * @param {string} reportedUserId - Reported user's ID
   * @param {string} reporterId - Reporter's user ID
   * @param {string} reportType - Type: 'nudity', 'harassment', 'minor', 'other'
   * @param {string} reportDetails - Additional details from reporter
   * @returns {Promise<Object>} Report result
   */
  async function handleUserReport(reportedUserVideo, reportedUserId, reporterId, reportType, reportDetails = '') {
    console.log(`[Moderation] User ${reporterId} reported ${reportedUserId} for: ${reportType}`);

    try {
      // Log report immediately (for admin review)
      const report = {
        reportedUserId,
        reporterId,
        reportType,
        reportDetails,
        timestamp: new Date().toISOString(),
        aiChecked: false,
        aiResult: null
      };

      // If report is about nudity or minors, run AI check
      if ((reportType === 'nudity' || reportType === 'minor') && reportedUserVideo) {
        console.log('[Moderation] Running AI check on reported user...');

        try {
          // Capture frame from reported user's video
          const frame = await captureVideoFrame(reportedUserVideo);

          // Send to Sightengine
          const apiResult = await checkImageWithSightengine(frame, 'nudity');

          // Analyze results
          const analysis = analyzeModeractionResults(apiResult);

          report.aiChecked = true;
          report.aiResult = analysis;

          console.log('[Moderation] AI check on report complete:', analysis);

          // If AI confirms unsafe content, take immediate action
          if (!analysis.isSafe) {
            await handleUnsafeContent(reportedUserId, analysis.reason, 'user-report-confirmed');
            report.actionTaken = 'User disconnected and banned';
          } else {
            // AI didn't find issues, but keep report for manual review
            report.actionTaken = 'Flagged for manual review';
          }

        } catch (aiError) {
          console.error('[Moderation] AI check failed on report:', aiError);
          report.aiChecked = false;
          report.aiError = aiError.message;
          report.actionTaken = 'Manual review required';
        }
      } else {
        // Non-nudity reports go straight to manual review
        report.actionTaken = 'Flagged for manual review';
      }

      // Send report to server for logging
      await logReportToServer(report);

      return report;

    } catch (error) {
      console.error('[Moderation] Error handling report:', error);
      throw error;
    }
  }

  /**
   * Handle unsafe content detection - disconnect and ban user
   * @param {string} userId - User to disconnect
   * @param {string} reason - Reason for disconnection
   * @param {string} source - 'auto-detection' or 'user-report-confirmed'
   */
  async function handleUnsafeContent(userId, reason, source) {
    console.warn(`[Moderation] UNSAFE CONTENT DETECTED for user ${userId}: ${reason} (${source})`);

    try {
      // Get username from current user data if available
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const username = currentUser.username || userId;

      // Alert the user
      alert(`⚠️ ACCOUNT SUSPENDED\n\n${reason}\n\nThis violation has been logged and your account has been suspended.\n\nYou will be redirected to the home page.`);

      // Disconnect the user (call your existing disconnect function)
      if (typeof disconnectUser === 'function') {
        disconnectUser(userId, reason);
      } else if (typeof socket !== 'undefined') {
        socket.emit('moderation-ban', { userId, reason, source });
      }

      // Log to server for admin review and suspension
      const response = await fetch('/api/moderation-violation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          username,
          reason,
          source,
          timestamp: new Date().toISOString()
        })
      });

      const result = await response.json();
      console.log('[Moderation] Suspension result:', result);

      // Clear user session
      localStorage.removeItem('currentUser');

      // Navigate away or reload
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);

    } catch (error) {
      console.error('[Moderation] Error handling unsafe content:', error);
    }
  }

  /**
   * Log report to server for admin review
   * @param {Object} report - Report data
   */
  async function logReportToServer(report) {
    try {
      const response = await fetch('/api/log-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });

      if (!response.ok) {
        console.error('[Moderation] Failed to log report to server');
      }

      console.log('[Moderation] Report logged successfully');
    } catch (error) {
      console.error('[Moderation] Error logging report:', error);
    }
  }

  /**
   * Reset moderation check count (call when starting new chat)
   */
  function resetCheckCount() {
    moderationCheckCount = 0;
    console.log('[Moderation] Check count reset');
  }

  /**
   * Get current moderation stats
   */
  function getStats() {
    return {
      checksUsed: moderationCheckCount,
      checksRemaining: MAX_FREE_CHECKS - moderationCheckCount,
      thresholds: THRESHOLDS
    };
  }

  // Public API
  return {
    moderateOnConnect,
    handleUserReport,
    captureVideoFrame,
    resetCheckCount,
    getStats,
    // Expose for manual testing
    checkImageWithSightengine,
    analyzeModeractionResults
  };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModerationModule;
}
