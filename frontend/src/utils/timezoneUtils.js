// Timezone utility for consistent time display
export const timezoneUtils = {
  // Convert backend time to display format
  formatTimeForDisplay: (timeString, timezone = 'Asia/Kolkata') => {
    if (!timeString) return '--:--';
    
    try {
      // Handle both HH:MM and HH:MM:SS formats
      const timeParts = timeString.split(':');
      const hours = timeParts[0].padStart(2, '0');
      const minutes = timeParts[1].padStart(2, '0');
      
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return '--:--';
    }
  },

  // Convert display time to backend format
  formatTimeForBackend: (timeString) => {
    if (!timeString) return null;
    
    try {
      const timeParts = timeString.split(':');
      const hours = timeParts[0].padStart(2, '0');
      const minutes = timeParts[1].padStart(2, '0');
      const seconds = timeParts[2] || '00';
      
      return `${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.error('Error formatting time for backend:', error);
      return null;
    }
  },

  // Get current time in house timezone
  getCurrentTimeInTimezone: (timezone = 'Asia/Kolkata') => {
    try {
      const now = new Date();
      const options = {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      };
      return now.toLocaleTimeString('en-US', options);
    } catch (error) {
      console.error('Error getting current time:', error);
      return new Date().toLocaleTimeString('en-US', { hour12: false });
    }
  },

  // Check if betting is still open
  isBettingOpen: (scheduledTime, bettingCloseTime, timezone = 'Asia/Kolkata') => {
    try {
      const now = new Date();
      const closeTime = new Date(bettingCloseTime);
      return now < closeTime;
    } catch (error) {
      console.error('Error checking betting status:', error);
      return false;
    }
  },

  // Format betting deadline
  formatBettingDeadline: (bettingCloseTime, timezone = 'Asia/Kolkata') => {
    try {
      const closeTime = new Date(bettingCloseTime);
      const options = {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      };
      return closeTime.toLocaleTimeString('en-US', options);
    } catch (error) {
      console.error('Error formatting betting deadline:', error);
      return '--:--';
    }
  }
};

export default timezoneUtils;
