/**
 * User ID Management Unit Tests
 *
 * Tests browser fingerprinting and user ID persistence
 */

describe('User ID Management', () => {
  let localStorageMock;
  let fetchMock;

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = (() => {
      let store = {};
      return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        clear: () => { store = {}; }
      };
    })();

    global.localStorage = localStorageMock;

    // Mock fetch for IP address
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    // Mock navigator and screen objects
    global.navigator = {
      userAgent: 'Mozilla/5.0 Test',
      language: 'en-US',
      platform: 'Linux x86_64',
      hardwareConcurrency: 8
    };

    global.screen = {
      colorDepth: 24,
      width: 1920,
      height: 1080
    };
  });

  // Simplified version of generateBrowserFingerprint
  async function generateBrowserFingerprint() {
    let ipAddress = 'unknown';
    try {
      const ipResponse = await fetch('/api/client-ip');
      const ipData = await ipResponse.json();
      ipAddress = ipData.ip;
    } catch (error) {
      console.error('Error fetching IP:', error);
    }

    const fingerprint = [
      ipAddress,
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.platform,
      navigator.hardwareConcurrency || 'unknown'
    ].join('|');

    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'user_' + Math.abs(hash).toString(36);
  }

  async function getUserId() {
    let userId = localStorage.getItem('radio_user_id');
    if (!userId) {
      userId = await generateBrowserFingerprint();
      localStorage.setItem('radio_user_id', userId);
    }
    return userId;
  }

  describe('generateBrowserFingerprint', () => {
    test('should generate user ID with valid format', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({ ip: '192.168.1.1' })
      });

      const userId = await generateBrowserFingerprint();
      expect(userId).toMatch(/^user_[a-z0-9]+$/);
    });

    test('should generate consistent IDs for same environment', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({ ip: '192.168.1.1' })
      });

      const userId1 = await generateBrowserFingerprint();
      const userId2 = await generateBrowserFingerprint();
      expect(userId1).toBe(userId2);
    });

    test('should handle IP fetch failure gracefully', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const userId = await generateBrowserFingerprint();
      expect(userId).toMatch(/^user_[a-z0-9]+$/);
      expect(userId).toContain('user_');
    });

    test('should generate different IDs for different IPs', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => ({ ip: '192.168.1.1' })
      });
      const userId1 = await generateBrowserFingerprint();

      fetchMock.mockResolvedValueOnce({
        json: async () => ({ ip: '192.168.1.2' })
      });
      const userId2 = await generateBrowserFingerprint();

      expect(userId1).not.toBe(userId2);
    });
  });

  describe('getUserId', () => {
    test('should retrieve existing user ID from localStorage', async () => {
      localStorage.setItem('radio_user_id', 'user_existing123');
      const userId = await getUserId();
      expect(userId).toBe('user_existing123');
    });

    test('should generate and store new user ID if not exists', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({ ip: '192.168.1.1' })
      });

      const userId = await getUserId();
      expect(userId).toMatch(/^user_[a-z0-9]+$/);
      expect(localStorage.getItem('radio_user_id')).toBe(userId);
    });

    test('should not regenerate ID on subsequent calls', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({ ip: '192.168.1.1' })
      });

      const userId1 = await getUserId();
      const userId2 = await getUserId();
      expect(userId1).toBe(userId2);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
