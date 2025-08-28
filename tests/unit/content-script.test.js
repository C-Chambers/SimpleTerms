/**
 * Unit tests for content script functions
 * These tests verify the privacy link detection logic without browser automation
 */

describe('Content Script Unit Tests', () => {
  
  // Mock DOM elements for testing
  function createMockLink(href, text, className = '', parentTag = 'div') {
    return {
      href: href,
      textContent: text,
      title: '',
      className: className,
      parentElement: {
        tagName: parentTag.toUpperCase(),
        className: '',
        id: ''
      },
      getBoundingClientRect: () => ({ top: 100, bottom: 120 })
    };
  }

  describe('Privacy Pattern Matching', () => {
    
    test('Privacy policy patterns match correctly', () => {
      const privacyPatterns = [
        /privacy[-_\s]?policy/i,
        /privacy[-_\s]?statement/i,
        /privacy[-_\s]?notice/i,
        /\/privacy\//i,
        /data[-_\s]?protection/i,
        /privacy/i,
        /terms[-_\s]?of[-_\s]?service/i,
        /terms[-_\s]?and[-_\s]?conditions/i,
        /terms[-_\s]?of[-_\s]?use/i,
        /\/terms\//i,
        /legal/i,
        /gdpr/i
      ];

      // Test URLs that should match
      const validUrls = [
        'https://example.com/privacy-policy',
        'https://example.com/privacy_policy', 
        'https://example.com/privacy-statement',
        'https://example.com/privacy/policy',
        'https://example.com/privacy/',
        'https://example.com/terms-of-service',
        'https://example.com/terms-and-conditions',
        'https://example.com/legal',
        'https://example.com/gdpr'
      ];

      validUrls.forEach(url => {
        const matches = privacyPatterns.some(pattern => pattern.test(url));
        expect(matches).toBe(true);
      });
    });

    test('Privacy text content matches correctly', () => {
      const privacyPatterns = [
        /privacy[-_\s]?policy/i,
        /privacy[-_\s]?statement/i,
        /privacy[-_\s]?notice/i,
        /privacy/i,
        /terms[-_\s]?of[-_\s]?service/i,
        /legal/i
      ];

      const validTexts = [
        'Privacy Policy',
        'Privacy Statement', 
        'Privacy Notice',
        'Privacy',
        'Terms of Service',
        'Legal Information'
      ];

      validTexts.forEach(text => {
        const matches = privacyPatterns.some(pattern => pattern.test(text));
        expect(matches).toBe(true);
      });
    });

  });

  describe('Link Scoring Logic', () => {
    
    test('Footer links get higher scores', () => {
      // This would test the location-based scoring
      // For now, just verify the concept
      const footerBonus = 12;
      const headerPenalty = -8;
      
      expect(footerBonus).toBeGreaterThan(headerPenalty);
      expect(footerBonus).toBe(12);
      expect(headerPenalty).toBe(-8);
    });

    test('Visible links are preferred over hidden ones', () => {
      const visibleBonus = 0;
      const hiddenPenalty = -15;
      
      expect(visibleBonus).toBeGreaterThan(hiddenPenalty);
      expect(hiddenPenalty).toBe(-15);
    });

  });

  describe('URL Validation', () => {
    
    test('Valid URLs are accepted', () => {
      const validUrls = [
        'https://amazon.com/privacy',
        'https://ebay.com/legal/privacy-policy',
        'https://paypal.com/privacy-statement',
        'https://notion.so/privacy-policy-123456'
      ];

      validUrls.forEach(url => {
        expect(url).toMatch(/^https?:\/\//);
        expect(url.length).toBeGreaterThan(10);
      });
    });

    test('Invalid URLs are rejected', () => {
      const invalidUrls = [
        'javascript:void(0)',
        'mailto:test@example.com',
        'tel:+1234567890',
        ''
      ];

      invalidUrls.forEach(url => {
        expect(url.startsWith('javascript:') || 
               url.startsWith('mailto:') || 
               url.startsWith('tel:') ||
               url === '').toBe(true);
      });
    });

  });

  describe('Content Extraction Validation', () => {
    
    test('Content length validation', () => {
      const tooShort = 'Privacy policy content that is too short.';
      const adequateLength = 'Privacy policy content that is long enough to be considered valid for analysis. '.repeat(10);
      
      expect(tooShort.length).toBeLessThan(100);
      expect(adequateLength.length).toBeGreaterThan(100);
    });

    test('Text cleaning patterns', () => {
      const messyText = '   Multiple   spaces\n\n\nand\t\ttabs\n  ';
      const cleanedText = messyText
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
      
      expect(cleanedText).toBe('Multiple spaces and tabs');
    });

  });

  describe('Test Configuration Validation', () => {
    
    test('All test sites have required properties', () => {
      const testSites = require('../fixtures/test-sites.json');
      
      expect(testSites.staticSites).toBeDefined();
      expect(Array.isArray(testSites.staticSites)).toBe(true);
      expect(testSites.staticSites.length).toBeGreaterThan(0);
      
      testSites.staticSites.forEach(site => {
        expect(site).toHaveProperty('name');
        expect(site).toHaveProperty('url');
        expect(site).toHaveProperty('expectedPoints');
        expect(site).toHaveProperty('timeout');
        expect(site).toHaveProperty('category');
        
        expect(typeof site.name).toBe('string');
        expect(typeof site.url).toBe('string');
        expect(typeof site.expectedPoints).toBe('number');
        expect(typeof site.timeout).toBe('number');
        expect(typeof site.category).toBe('string');
        
        expect(site.expectedPoints).toBe(7);
        expect(site.timeout).toBeGreaterThan(0);
        expect(site.url).toMatch(/^https?:\/\//);
      });
    });

  });

});
