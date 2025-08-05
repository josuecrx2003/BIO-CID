import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get all active keys for debugging
    const { data: keys, error } = await supabase
      .from('software_keys')
      .select('*')
      .eq('is_active', true)
      .limit(10)

    if (error) {
      console.error('Error fetching keys:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      keys: keys?.map(key => ({
        id: key.id,
        key_value: key.key_value,
        description: key.description,
        usage_count: key.usage_count,
        max_usage: key.max_usage,
        created_at: key.created_at
      })) || []
    })
  } catch (error) {
    console.error('Debug keys error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { testKey } = await request.json()
    
    if (!testKey) {
      return NextResponse.json(
        { success: false, error: 'testKey is required' },
        { status: 400 }
      )
    }

    // Search for the specific key
    const { data: keyData, error: keyError } = await supabase
      .from('software_keys')
      .select('*')
      .eq('key_value', testKey)
      .eq('is_active', true)
      .single()

    return NextResponse.json({
      success: true,
      found: !!keyData,
      key: keyData,
      error: keyError?.message || null,
      searchedFor: testKey
    })
  } catch (error) {
    console.error('Debug key search error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}