<?php

namespace Database\Seeders;

/**
 * Initial demo catalog for local/staging only.
 * Loaded by TripDeckSeeder into MySQL — not used by the React app at runtime.
 */
class TripDeckSeedData
{
    public static function all(): array
    {
        return array (
  'products' => 
  array (
    0 => 
    array (
      'id' => 'prod_leads',
      'name' => 'Leads',
      'category' => 'leads',
      'color' => '#f59e0b',
      'description' => 'Verified travel leads delivered directly to your CRM',
      'plans' => 
      array (
        0 => 
        array (
          'id' => 'plan_leads_starter',
          'name' => 'Starter',
          'description' => '50 leads/month',
          'mrp' => 2999,
          'billing' => 'monthly',
          'features' => 
          array (
            0 => '50 verified leads/mo',
            1 => 'Email + WhatsApp delivery',
            2 => 'Lead quality score',
            3 => 'Basic CRM integration',
            4 => '7-day support',
          ),
        ),
        1 => 
        array (
          'id' => 'plan_leads_growth',
          'name' => 'Growth',
          'description' => '150 leads/month',
          'mrp' => 6999,
          'billing' => 'monthly',
          'features' => 
          array (
            0 => '150 verified leads/mo',
            1 => 'Priority delivery',
            2 => 'Lead quality score',
            3 => 'Full CRM integration',
            4 => 'Dedicated support',
            5 => 'Monthly performance report',
          ),
        ),
        2 => 
        array (
          'id' => 'plan_leads_pro',
          'name' => 'Pro',
          'description' => 'Unlimited leads',
          'mrp' => 14999,
          'billing' => 'monthly',
          'features' => 
          array (
            0 => 'Unlimited leads/mo',
            1 => 'Real-time delivery',
            2 => 'Advanced filtering',
            3 => 'API access',
            4 => 'Dedicated account manager',
            5 => 'Weekly strategy calls',
          ),
        ),
      ),
    ),
    1 => 
    array (
      'id' => 'prod_crm',
      'name' => 'CRM',
      'category' => 'crm',
      'color' => '#3b82f6',
      'description' => 'Complete CRM built for travel agents - bookings, follow-ups, pipeline',
      'plans' => 
      array (
        0 => 
        array (
          'id' => 'plan_crm_basic',
          'name' => 'Basic',
          'description' => '1 user',
          'mrp' => 999,
          'billing' => 'monthly',
          'features' => 
          array (
            0 => '1 user seat',
            1 => 'Booking management',
            2 => 'Customer profiles',
            3 => 'Follow-up reminders',
            4 => 'Basic reports',
            5 => 'Email support',
          ),
        ),
        1 => 
        array (
          'id' => 'plan_crm_pro',
          'name' => 'Pro',
          'description' => '5 users',
          'mrp' => 2999,
          'billing' => 'monthly',
          'features' => 
          array (
            0 => '5 user seats',
            1 => 'Full pipeline management',
            2 => 'Automated follow-ups',
            3 => 'WhatsApp integration',
            4 => 'Advanced analytics',
            5 => 'Priority support',
          ),
        ),
        2 => 
        array (
          'id' => 'plan_crm_enterprise',
          'name' => 'Enterprise',
          'description' => 'Unlimited users',
          'mrp' => 7999,
          'billing' => 'monthly',
          'features' => 
          array (
            0 => 'Unlimited users',
            1 => 'Custom workflows',
            2 => 'API & webhooks',
            3 => 'White-label option',
            4 => 'Dedicated server',
            5 => '24/7 phone support',
          ),
        ),
      ),
    ),
    2 => 
    array (
      'id' => 'prod_website',
      'name' => 'Website',
      'category' => 'website',
      'color' => '#8b5cf6',
      'description' => 'Ready-made travel agency website with booking integration',
      'plans' => 
      array (
        0 => 
        array (
          'id' => 'plan_website_standard',
          'name' => 'Standard',
          'description' => '1 page',
          'mrp' => 4999,
          'billing' => 'one-time',
          'hosting' => 499,
          'features' => 
          array (
            0 => '1-page website',
            1 => 'Mobile responsive',
            2 => 'Booking inquiry form',
            3 => 'WhatsApp chat widget',
            4 => 'SSL certificate',
            5 => 'Free domain 1st year',
          ),
        ),
        1 => 
        array (
          'id' => 'plan_website_business',
          'name' => 'Business',
          'description' => '5 pages + blog',
          'mrp' => 12999,
          'billing' => 'one-time',
          'hosting' => 999,
          'features' => 
          array (
            0 => '5-page website + blog',
            1 => 'Tour package pages',
            2 => 'Online booking engine',
            3 => 'Payment gateway',
            4 => 'SEO optimization',
            5 => 'Social media links',
          ),
        ),
        2 => 
        array (
          'id' => 'plan_website_premium',
          'name' => 'Premium',
          'description' => 'Full custom',
          'mrp' => 29999,
          'billing' => 'one-time',
          'hosting' => 1999,
          'features' => 
          array (
            0 => 'Fully custom design',
            1 => 'Unlimited pages',
            2 => 'Booking + payment system',
            3 => 'Customer portal',
            4 => 'Admin dashboard',
            5 => 'Priority development',
          ),
        ),
      ),
    ),
    3 => 
    array (
      'id' => 'prod_ads',
      'name' => 'Banner Ads',
      'category' => 'ads',
      'color' => '#ef4444',
      'description' => 'Banner placements on Tripclap.com travel marketplace',
      'plans' => 
      array (
        0 => 
        array (
          'id' => 'plan_ads_basic',
          'name' => 'Basic',
          'description' => '1 placement',
          'mrp' => 1999,
          'billing' => 'monthly',
          'features' => 
          array (
            0 => '1 banner placement',
            1 => 'Category pages only',
            2 => 'Standard ad size',
            3 => 'Monthly impressions report',
            4 => 'Ad creative support',
          ),
        ),
        1 => 
        array (
          'id' => 'plan_ads_standard',
          'name' => 'Standard',
          'description' => '3 placements',
          'mrp' => 4499,
          'billing' => 'monthly',
          'features' => 
          array (
            0 => '3 banner placements',
            1 => 'Category + listing pages',
            2 => 'Multiple ad sizes',
            3 => 'Click tracking',
            4 => 'Bi-weekly reports',
            5 => 'Priority placement',
          ),
        ),
        2 => 
        array (
          'id' => 'plan_ads_premium',
          'name' => 'Premium',
          'description' => 'Homepage feature',
          'mrp' => 9999,
          'billing' => 'monthly',
          'features' => 
          array (
            0 => 'Homepage featured slot',
            1 => 'All page placements',
            2 => 'Video banner support',
            3 => 'Real-time analytics',
            4 => 'Dedicated ad manager',
            5 => 'A/B testing',
          ),
        ),
      ),
    ),
  ),
  'clients' => 
  array (
    0 => 
    array (
      'id' => 'client_skyline',
      'agency' => 'Skyline Travel & Tours',
      'contact' => 'Rajesh Mehta',
      'email' => 'rajesh@skylinetravel.com',
      'phone' => '98765 43210',
      'city' => 'Mumbai',
      'state' => 'Maharashtra',
      'gst' => '27AABCT1234A1Z5',
      'notes' => '',
    ),
    1 => 
    array (
      'id' => 'client_wanderlust',
      'agency' => 'Wanderlust Holidays',
      'contact' => 'Priya Sharma',
      'email' => 'priya@wanderlust.in',
      'phone' => '91234 56789',
      'city' => 'Delhi',
      'state' => 'Delhi',
      'gst' => '07AABCW5678B1Z3',
      'notes' => '',
    ),
    2 => 
    array (
      'id' => 'client_royal',
      'agency' => 'Royal Journeys Pvt Ltd',
      'contact' => 'Amit Patel',
      'email' => 'amit@royaljourneys.com',
      'phone' => '90000 12345',
      'city' => 'Ahmedabad',
      'state' => 'Gujarat',
      'gst' => '24AABCR9012C1Z1',
      'notes' => '',
    ),
    3 => 
    array (
      'id' => 'client_heritage',
      'agency' => 'Heritage Tours',
      'contact' => 'Sunita Reddy',
      'email' => 'sunita@heritagetours.in',
      'phone' => '87654 32109',
      'city' => 'Hyderabad',
      'state' => 'Telangana',
      'gst' => '36AABCH3456D1Z9',
      'notes' => '',
    ),
    4 => 
    array (
      'id' => 'client_blue',
      'agency' => 'Blue Horizon Travels',
      'contact' => 'Kiran Kumar',
      'email' => 'kiran@bluehorizon.com',
      'phone' => '93456 78901',
      'city' => 'Bangalore',
      'state' => 'Karnataka',
      'gst' => '29AABCB7890E1Z7',
      'notes' => '',
    ),
    5 => 
    array (
      'id' => 'client_pearl',
      'agency' => 'Pearl Travels',
      'contact' => 'Meena Nair',
      'email' => 'meena@pearltravels.in',
      'phone' => '94567 89012',
      'city' => 'Chennai',
      'state' => 'Tamil Nadu',
      'gst' => '33AABCP2345F1Z5',
      'notes' => '',
    ),
  ),
  'settings' => 
  array (
    'company' => 
    array (
      'name' => 'Tripclap (ThinkNext Technologies Pvt Ltd)',
      'tagline' => 'Empowering Travel Agents Across India',
      'gst' => '29AABCT9876A1Z2',
      'address' => '4th Floor, Tower B, Cyber City, Gurugram, Haryana 122002',
      'signatory' => 'Vikram Tiwari',
      'designation' => 'Head of Sales',
      'phone' => '98100 55678',
      'website' => 'agents.tripclap.com',
      'about' => 'Tripclap is India\'s leading platform dedicated to travel agents. Through agents.tripclap.com, we provide verified leads, a purpose-built CRM, professional websites, and marketplace exposure - everything you need to grow your travel business.',
    ),
    'payment' => 
    array (
      'bank' => 'HDFC Bank',
      'account' => '50100234567890',
      'ifsc' => 'HDFC0001234',
      'holder' => 'ThinkNext Technologies Pvt Ltd',
      'type' => 'Current',
      'upi' => 'tripclap@hdfcbank',
      'razorpayKey' => '',
    ),
    'email' => 
    array (
      'mode' => 'gmail_oauth',
      'smtpHost' => 'smtp.gmail.com',
      'smtpPort' => '587',
      'smtpUser' => 'proposals@tripclap.com',
      'smtpPassword' => '',
      'gmailConnected' => false,
      'fromName' => 'Tripclap Sales',
      'fromEmail' => 'proposals@tripclap.com',
      'subjectTemplate' => 'Tripclap Proposal {{id}} for {{agency}}',
    ),
    'defaults' => 
    array (
      'gstRate' => 18,
      'validityDays' => 7,
      'proposalPrefix' => 'TC',
      'proposalStartNumber' => 1,
      'maxRepDiscount' => 30,
      'kyc' => 
      array (
        0 => 'GST Registration Certificate',
        1 => 'PAN Card of Business / Proprietor',
        2 => 'Business Registration Certificate',
        3 => 'Cancelled Cheque / Bank Statement',
        4 => 'Aadhaar of Authorized Signatory',
      ),
      'terms' => 
      array (
        0 => 'This proposal is valid for the number of days mentioned above from the date of issue.',
        1 => 'Prices are subject to change after the validity period.',
        2 => 'Services will be activated within 48 hours of KYC completion and payment confirmation.',
        3 => 'No refund will be issued after account activation.',
        4 => 'For support, contact support@tripclap.com',
      ),
    ),
  ),
  'proposals' => 
  array (
    0 => 
    array (
      'id' => 'TC-2025-0012',
      'clientId' => 'client_skyline',
      'products' => 
      array (
        0 => 'Leads (Growth)',
        1 => 'CRM (Pro)',
      ),
      'amount' => 118530,
      'status' => 'Accepted',
      'date' => '2025-04-12',
      'repId' => 'rep_aditya',
    ),
    1 => 
    array (
      'id' => 'TC-2025-0011',
      'clientId' => 'client_wanderlust',
      'products' => 
      array (
        0 => 'Website (Business)',
      ),
      'amount' => 16757,
      'status' => 'Sent',
      'date' => '2025-04-10',
      'repId' => 'rep_aditya',
    ),
    2 => 
    array (
      'id' => 'TC-2025-0010',
      'clientId' => 'client_royal',
      'products' => 
      array (
        0 => 'Leads (Pro)',
        1 => 'CRM (Enterprise)',
        2 => 'Banner Ads (Standard)',
      ),
      'amount' => 298474,
      'status' => 'Accepted',
      'date' => '2025-04-05',
      'repId' => 'rep_sneha',
    ),
    3 => 
    array (
      'id' => 'TC-2025-0009',
      'clientId' => 'client_heritage',
      'products' => 
      array (
        0 => 'CRM (Basic)',
      ),
      'amount' => 14155,
      'status' => 'Draft',
      'date' => '2025-04-01',
      'repId' => 'rep_aditya',
    ),
    4 => 
    array (
      'id' => 'TC-2025-0008',
      'clientId' => 'client_blue',
      'products' => 
      array (
        0 => 'Leads (Starter)',
        1 => 'Banner Ads (Basic)',
      ),
      'amount' => 57728,
      'status' => 'Expired',
      'date' => '2025-03-20',
      'repId' => 'rep_sneha',
    ),
    5 => 
    array (
      'id' => 'TC-2025-0007',
      'clientId' => 'client_pearl',
      'products' => 
      array (
        0 => 'Leads (Growth)',
        1 => 'CRM (Pro)',
        2 => 'Website (Standard)',
      ),
      'amount' => 147200,
      'status' => 'Revised',
      'date' => '2025-03-15',
      'repId' => 'rep_aditya',
    ),
  ),
  'reps' => 
  array (
    0 => 
    array (
      'id' => 'rep_aditya',
      'name' => 'Aditya Bose',
      'email' => 'aditya@tripclap.com',
      'phone' => '98100 55678',
      'role' => 'Sales Rep',
    ),
    1 => 
    array (
      'id' => 'rep_sneha',
      'name' => 'Sneha Kapoor',
      'email' => 'sneha@tripclap.com',
      'phone' => '98100 55679',
      'role' => 'Sales Rep',
    ),
  ),
);
    }
}
