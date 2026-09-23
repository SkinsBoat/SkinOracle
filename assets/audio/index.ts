import alertOneSound from "./alert.mp3";

/**
 * Centralized Audio Registry
 * Exported as alertOneSound so the underlying audio file can be swapped
 * or updated in a single place without modifying consumers.
 */
export const ALERT_ONE_SOUND = alertOneSound;
export { alertOneSound };
export default alertOneSound;
