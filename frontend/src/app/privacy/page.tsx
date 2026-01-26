'use client';

import Link from 'next/link';
import { Shield, ArrowLeft, Lock, Trash2, Eye, Server } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 text-slate-600 hover:text-slate-800">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to App</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Shield className="w-5 h-5 text-violet-600" />
              </div>
              <span className="font-bold text-slate-800">AI Privacy Guard</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Privacy Policy
            </h1>
            <p className="text-slate-500">
              Last updated: January 2026
            </p>
          </div>

          {/* Key Points */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="p-2 bg-green-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800">No Data Storage</h3>
                <p className="text-sm text-green-700">Images are processed in memory and immediately deleted</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-800">Secure Processing</h3>
                <p className="text-sm text-blue-700">All data transmitted over encrypted HTTPS connection</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-800">No Tracking</h3>
                <p className="text-sm text-purple-700">We don&apos;t use cookies or track your activity</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Server className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800">No AI Training</h3>
                <p className="text-sm text-amber-700">Your images are never used to train our models</p>
              </div>
            </div>
          </div>

          {/* Detailed Policy */}
          <div className="prose prose-slate max-w-none">
            <h2 className="text-xl font-bold text-slate-800 mb-4">1. Introduction</h2>
            <p className="text-slate-600 mb-6">
              AI Privacy Guard (&quot;we&quot;, &quot;our&quot;, or &quot;the Service&quot;) is committed to protecting your privacy. 
              This Privacy Policy explains how we handle your data when you use our image privacy protection service.
            </p>

            <h2 className="text-xl font-bold text-slate-800 mb-4">2. Information We Process</h2>
            <p className="text-slate-600 mb-4">
              When you use AI Privacy Guard, we temporarily process:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>Images you upload for face and license plate detection</li>
              <li>Processing preferences (blur mode, intensity settings)</li>
              <li>Optional feedback you submit about detection accuracy</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-800 mb-4">3. How We Handle Your Images</h2>
            <p className="text-slate-600 mb-4">
              <strong>We do NOT store your images.</strong> Here&apos;s exactly what happens:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>Images are uploaded directly to our processing server via HTTPS</li>
              <li>AI detection runs entirely in server memory</li>
              <li>Processed images are returned to your browser immediately</li>
              <li>Original and processed images are deleted from memory after processing</li>
              <li>No images are saved to disk, database, or any persistent storage</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-800 mb-4">4. Data We Do NOT Collect</h2>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>Personal identification information</li>
              <li>Email addresses or contact information</li>
              <li>Location data</li>
              <li>Device identifiers</li>
              <li>Browsing history</li>
              <li>Cookies for tracking purposes</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-800 mb-4">5. Rate Limiting</h2>
            <p className="text-slate-600 mb-6">
              To prevent abuse, we implement rate limiting based on IP addresses. This data is stored 
              temporarily (24 hours maximum) and is used solely for service protection. IP addresses 
              are not linked to any personal information or image data.
            </p>

            <h2 className="text-xl font-bold text-slate-800 mb-4">6. Feedback Data</h2>
            <p className="text-slate-600 mb-6">
              If you submit feedback about missed detections, we collect only the feedback type 
              (face or license plate) and optional comments. This helps us improve our AI models. 
              Feedback is anonymous and not linked to any images or personal information.
            </p>

            <h2 className="text-xl font-bold text-slate-800 mb-4">7. Third-Party Services</h2>
            <p className="text-slate-600 mb-6">
              Our service is hosted on Render.com. Please refer to their privacy policy for 
              information about infrastructure-level data handling. We do not share any user 
              data with third parties for marketing or advertising purposes.
            </p>

            <h2 className="text-xl font-bold text-slate-800 mb-4">8. Children&apos;s Privacy</h2>
            <p className="text-slate-600 mb-6">
              Our service is not directed at children under 13. We do not knowingly collect 
              personal information from children.
            </p>

            <h2 className="text-xl font-bold text-slate-800 mb-4">9. Changes to This Policy</h2>
            <p className="text-slate-600 mb-6">
              We may update this Privacy Policy from time to time. We will notify users of any 
              material changes by updating the &quot;Last updated&quot; date at the top of this page.
            </p>

            <h2 className="text-xl font-bold text-slate-800 mb-4">10. Contact Us</h2>
            <p className="text-slate-600 mb-6">
              If you have any questions about this Privacy Policy, please contact us through 
              our GitHub repository or the feedback feature in the app.
            </p>
          </div>

          {/* Back Button */}
          <div className="mt-12 text-center">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to App
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-slate-500">
            © 2026 AI Privacy Guard. Your privacy is our priority.
          </p>
        </div>
      </footer>
    </div>
  );
}
