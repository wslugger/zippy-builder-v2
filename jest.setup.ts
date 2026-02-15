import '@testing-library/jest-dom';
import 'jest-canvas-mock';
import util from 'util';

// Mock TextEncoder/TextDecoder if not available in environment
if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = util.TextEncoder as unknown as typeof global.TextEncoder;
    global.TextDecoder = util.TextDecoder as unknown as typeof global.globalThis.TextDecoder;
}
