'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface Testimonial {
  slug: string;
  name: string;
  role: string;
  location: string;
  coach: string;
  voice_paragraph: string;
  theme: string;
  designs: string[];
  chosen_design_index?: number;
}

interface PageProps {
  params: {
    slug: string;
  };
}

export default function TestimonialPage({ params }: PageProps) {
  const [testimonial, setTestimonial] = useState<Testimonial | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchTestimonial();
  }, [params.slug]);

  const fetchTestimonial = async () => {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('slug', params.slug)
        .single();

      if (error) {
        console.error('Error fetching testimonial:', error);
        return;
      }

      setTestimonial(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectDesign = async (designIndex: number) => {
    if (!testimonial) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/save-testimonial', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: testimonial.slug,
          chosen_design_index: designIndex,
        }),
      });

      if (response.ok) {
        // Reload the page to show only the selected design
        router.refresh();
        fetchTestimonial();
      } else {
        console.error('Failed to save design selection');
      }
    } catch (error) {
      console.error('Error saving design selection:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading testimonial...</p>
        </div>
      </div>
    );
  }

  if (!testimonial) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Testimonial Not Found</h1>
          <p className="text-gray-600">The testimonial you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const hasChosenDesign = typeof testimonial.chosen_design_index === 'number';
  const displayDesigns = hasChosenDesign 
    ? [testimonial.designs[testimonial.chosen_design_index!]]
    : testimonial.designs || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {testimonial.name}'s Testimonial
          </h1>
          <p className="text-lg text-gray-600">
            {testimonial.role} • {testimonial.location}
          </p>
          {hasChosenDesign && (
            <p className="text-sm text-green-600 mt-2 font-medium">
              ✓ Design selected! This is your final testimonial page.
            </p>
          )}
        </div>

        {/* Design Selection Instructions */}
        {!hasChosenDesign && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Choose Your Design
            </h2>
            <p className="text-blue-800">
              We've created 4 different designs for your testimonial. 
              Select your favorite by clicking "Use This One" below the design you prefer.
            </p>
          </div>
        )}

        {/* Designs Display */}
        <div className="space-y-8">
          {displayDesigns.map((design, index) => {
            const actualIndex = hasChosenDesign ? testimonial.chosen_design_index! : index;
            return (
              <div key={actualIndex} className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Design Preview */}
                <div className="p-6 border-b border-gray-200">
                  <div className="text-sm text-gray-500 mb-4">
                    Design {actualIndex + 1} {hasChosenDesign && '(Selected)'}
                  </div>
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: design }}
                  />
                </div>

                {/* Use This One Button */}
                {!hasChosenDesign && (
                  <div className="px-6 py-4 bg-gray-50 text-center">
                    <button
                      onClick={() => selectDesign(index)}
                      disabled={saving}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        'Use This One'
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Coach: {testimonial.coach}</p>
          <p className="mt-1">Theme: {testimonial.theme}</p>
        </div>
      </div>
    </div>
  );
} 