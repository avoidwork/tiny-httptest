/**
 * Cookie jar for storing and reusing cookies across requests
 * @type {Map<string, string>}
 */
export const jar = new Map();
/**
 * Map for storing captured headers across requests
 * @type {Map<string, string>}
 */
export const captured = new Map();
/**
 * Map for storing ETags across requests
 * @type {Map<string, string>}
 */
export const etags = new Map();
