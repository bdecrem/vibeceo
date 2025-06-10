import { supabase } from '../supabase.js';

// Add a new item to Supabase (async version for ADD command)
export async function addItemToSupabase(itemData: any): Promise<{ success: boolean, itemId?: number, error?: string }> {
  try {
    // Get next item number
    const { data: maxData, error: maxError } = await supabase
      .from('af_daily_message')
      .select('item')
      .order('item', { ascending: false })
      .limit(1);

    if (maxError) {
      console.error('Error getting max item number:', maxError);
      return { success: false, error: maxError.message };
    }

    const newItemId = maxData && maxData.length > 0 ? maxData[0].item + 1 : 1;
    
    let supabaseRecord: any;
    
    if (itemData.type === 'interactive') {
      // Flatten interactive structure for Supabase
      supabaseRecord = {
        item: newItemId,
        type: itemData.type,
        quotation_marks: 'no', // Interactive messages don't use quotes
        prepend: null,
        text: itemData.response.text,
        author: itemData.response.author,
        intro: null,
        outro: null,
        trigger_keyword: itemData.trigger.keyword,
        trigger_text: itemData.trigger.text
      };
    } else {
      // Standard structure for other types
      supabaseRecord = {
        item: newItemId,
        type: itemData.type,
        quotation_marks: itemData['quotation-marks'] || 'no',
        prepend: itemData.prepend || null,
        text: itemData.text,
        author: itemData.author || null,
        intro: itemData.intro || null,
        outro: itemData.outro || null,
        trigger_keyword: null,
        trigger_text: null
      };
    }
    
    const { error: insertError } = await supabase
      .from('af_daily_message')
      .insert([supabaseRecord]);
    
    if (insertError) {
      console.error('Error inserting to Supabase:', insertError);
      return { success: false, error: insertError.message };
    }
    
    console.log(`Successfully added item ${newItemId} to Supabase af_daily_message table`);
    
    // Clear the global cache so new items are immediately available
    try {
      const { clearInspirationsCache } = await import('./handlers.js');
      clearInspirationsCache();
      console.log('Cache cleared - new item immediately available for MORE/SKIP commands');
    } catch (error) {
      console.log('Note: Could not clear cache automatically - new item will be available on next restart');
    }
    
    return { success: true, itemId: newItemId };
  } catch (error) {
    console.error('Error adding item to Supabase:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
} 