// @ts-nocheck
/**
 * Date Helpers
 * Safe date parsing and formatting WITHOUT timezone shifts
 * 
 * CRITICAL: Never use new Date("YYYY-MM-DD") - it parses as UTC and shifts dates in non-UTC timezones
 */

/**
 * Parse YYYY-MM-DD string into local Date object
 * Avoids UTC parsing that causes date shifts in IST/other timezones
 */
export function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  // Normalize: take first 10 chars if longer (handles "2026-10-09T00:00:00" etc)
  const normalized = dateStr.slice(0, 10);
  
  // Validate format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  
  const [year, month, day] = normalized.split('-').map(Number);
  
  // Validate ranges
  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  
  // Create date in LOCAL timezone (month is 0-indexed in JS Date)
  const date = new Date(year, month - 1, day);
  
  // Verify the date is valid (handles invalid dates like Feb 30)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  
  return date;
}

/**
 * Format date string as human-readable
 * Example: "2026-10-09" -> "October 9, 2026"
 */
export function formatDateLong(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  if (!date) return dateStr || 'Invalid Date';
  
  try {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format date string as short
 * Example: "2026-10-09" -> "Oct 9, 2026"
 */
export function formatDateShort(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  if (!date) return dateStr || 'Invalid Date';
  
  try {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format date with day of week
 * Example: "2026-10-09" -> "Friday, October 9, 2026"
 */
export function formatDateWithDay(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  if (!date) return dateStr || 'Invalid Date';
  
  try {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}

/**
 * Convert 24-hour time to 12-hour format
 * Example: "21:55" -> "9:55 PM"
 */
export function format12Hour(time24: string): string {
  if (!time24 || typeof time24 !== 'string') return '';
  
  const [hoursStr, minutesStr] = time24.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  if (isNaN(hours) || isNaN(minutes)) return time24;
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const displayMinutes = String(minutes).padStart(2, '0');
  
  return `${displayHours}:${displayMinutes} ${period}`;
}

/**
 * Convert 12-hour time to 24-hour format
 * Example: "9:55 PM" -> "21:55"
 */
export function format24Hour(time12: string, period: 'AM' | 'PM'): string {
  const [hoursStr, minutesStr] = time12.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  if (isNaN(hours) || isNaN(minutes)) return '00:00';
  
  if (period === 'AM' && hours === 12) hours = 0;
  if (period === 'PM' && hours !== 12) hours += 12;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Normalize date string to YYYY-MM-DD
 * Handles various input formats and returns safe YYYY-MM-DD or null
 */
export function normalizeDateString(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  
  // Already in correct format
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  
  // Has timestamp - extract date part
  if (input.includes('T') || input.includes(' ')) {
    const dateOnly = input.split(/[T\s]/)[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;
  }
  
  return null;
}

/**
 * Get today's date as YYYY-MM-DD in local timezone
 */
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
