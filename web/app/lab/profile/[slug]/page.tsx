import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

interface Profile {
  slug: string;
  name: string;
  bio: string;
  favorite_food: string;
  favorite_music: string;
  quote: string;
  phone_number?: string;
}

interface PageProps {
  params: {
    slug: string;
  };
}

async function getProfile(slug: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}

export default async function ProfilePage({ params }: PageProps) {
  const profile = await getProfile(params.slug);

  if (!profile) {
    notFound();
  }

  return (
    <div className="prose mx-auto p-6 text-center max-w-2xl">
      <h1 className="text-4xl font-bold mb-4 text-gray-800">{profile.name}</h1>
      
      {profile.bio && (
        <p className="text-lg text-gray-600 mb-6">{profile.bio}</p>
      )}
      
      <div className="bg-gray-50 rounded-lg p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">About {profile.name.split(' ')[0]}</h2>
        
        <div className="space-y-3 text-left">
          {profile.favorite_food && (
            <div className="flex items-center">
              <span className="text-2xl mr-3">🍴</span>
              <div>
                <strong className="text-gray-700">Favorite food:</strong>
                <span className="ml-2 text-gray-600">{profile.favorite_food}</span>
              </div>
            </div>
          )}
          
          {profile.favorite_music && (
            <div className="flex items-center">
              <span className="text-2xl mr-3">🎵</span>
              <div>
                <strong className="text-gray-700">Favorite music:</strong>
                <span className="ml-2 text-gray-600">{profile.favorite_music}</span>
              </div>
            </div>
          )}
          
          {profile.quote && (
            <div className="flex items-start">
              <span className="text-2xl mr-3">💭</span>
              <div>
                <strong className="text-gray-700">Favorite quote:</strong>
                <blockquote className="ml-2 text-gray-600 italic">"{profile.quote}"</blockquote>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 text-sm text-gray-500">
        Profile: {profile.slug}
      </div>
    </div>
  );
} 