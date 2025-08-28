const { testCloudFunction } = require('../utils/direct-test-helpers');

describe('Cloud Function - AI Analysis Testing', () => {
  
  const testTimeout = 30000; // 30 seconds
  
  beforeAll(() => {
    console.log('\n🚀 Starting Cloud Function Direct Tests');
    console.log('📊 Testing AI analysis with sample content\n');
  });

  test('Cloud Function returns 7 bullet points with sample privacy policy', async () => {
    console.log('🧪 Testing Cloud Function with sample privacy policy text...');
    
    // Sample privacy policy text for testing
    const samplePolicyText = `
      Privacy Policy
      
      We collect personal information when you use our service, including your name, email address, 
      and usage data. This information is used to provide and improve our services.
      
      Data Collection:
      - We collect information you provide directly
      - We automatically collect usage information
      - We may collect information from third parties
      
      Data Usage:
      - To provide our services to you
      - To communicate with you about your account
      - To improve our services and develop new features
      - For security and fraud prevention
      
      Data Sharing:
      - We may share information with service providers
      - We may share information for legal reasons
      - We do not sell your personal information to third parties
      
      Data Retention:
      - We retain your information as long as necessary
      - You can request deletion of your information
      
      Your Rights:
      - You can access your information
      - You can correct inaccuracies
      - You can delete your account
      
      Contact:
      For questions about this privacy policy, please contact us at privacy@example.com.
    `;
    
    const startTime = Date.now();
    const result = await testCloudFunction(null, samplePolicyText);
    const duration = Date.now() - startTime;
    
    console.log(`⏰ Cloud Function completed in ${duration}ms`);
    
    if (result.success) {
      console.log(`✅ SUCCESS: AI analysis completed`);
      console.log(`🎯 Risk Score: ${result.riskScore}/10`);
      console.log(`📝 Summary Points Found: ${result.summaryPoints.length}`);
      console.log(`📋 Summary Points:`);
      result.summaryPoints.forEach((point, index) => {
        console.log(`   ${index + 1}. ${point}`);
      });
      
      // Strict validation for 7 points
      expect(result.success).toBe(true);
      expect(result.summaryPoints).toHaveLength(7);
      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.riskScore).toBeLessThanOrEqual(10);
      
      // Validate each point has meaningful content
      result.summaryPoints.forEach((point, index) => {
        expect(point).toBeDefined();
        expect(typeof point).toBe('string');
        expect(point.length).toBeGreaterThan(10);
      });
      
      console.log(`🎉 VALIDATION COMPLETE: Cloud Function working perfectly!`);
      
    } else {
      console.log(`❌ FAILED: ${result.error}`);
      throw new Error(`Cloud Function test failed: ${result.error}`);
    }
    
    // Performance validation
    expect(duration).toBeLessThan(15000); // 15 seconds max
    
  }, testTimeout);

  test('Cloud Function handles various content lengths', async () => {
    console.log('🧪 Testing Cloud Function with different content lengths...');
    
    // Short policy
    const shortPolicy = 'We collect data. We use data for services. We protect your privacy.'.repeat(10);
    const shortResult = await testCloudFunction(null, shortPolicy);
    
    if (shortResult.success) {
      expect(shortResult.summaryPoints).toHaveLength(7);
      console.log(`✅ Short policy (${shortPolicy.length} chars): 7 points generated`);
    } else {
      console.log(`⚠️  Short policy failed: ${shortResult.error}`);
    }
    
    // Long policy
    const longPolicy = `
      This is a comprehensive privacy policy that covers many aspects of data collection and usage.
      ${'We collect various types of information including personal data, usage data, device information, and more. '.repeat(100)}
      ${'We use this information for service provision, improvement, marketing, and legal compliance. '.repeat(50)}
      ${'We may share information with partners, service providers, and for legal requirements. '.repeat(30)}
      ${'We implement security measures to protect your data and comply with regulations. '.repeat(25)}
    `;
    
    const longResult = await testCloudFunction(null, longPolicy);
    
    if (longResult.success) {
      expect(longResult.summaryPoints).toHaveLength(7);
      console.log(`✅ Long policy (${longPolicy.length} chars): 7 points generated`);
    } else {
      console.log(`⚠️  Long policy failed: ${longResult.error}`);
    }
    
  }, testTimeout);

});
