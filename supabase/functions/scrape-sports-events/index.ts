import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface Channel {
  id: string;
  name: string;
  channel_number?: string;
}

interface RequestBody {
  company_id: string;
  channels: Channel[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { company_id, channels }: RequestBody = await req.json();

    if (!company_id || !channels || channels.length === 0) {
      throw new Error('Missing required fields');
    }

    const now = new Date();
    const ukNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    const fourWeeksFromNow = new Date(ukNow.getTime() + 28 * 24 * 60 * 60 * 1000);

    const channelNames = channels.map(c => c.name).join(', ');

    const prompt = `You are an AI tasked with retrieving a list of sporting events broadcasted over the next 4 weeks on these channels: ${channelNames}.

Your output must include the following details for each event:
1. Event Title
2. Date
3. Start Time
4. Channel
5. Category (e.g., Football, Basketball, Tennis, etc.)

The events must be genuine and verified from reputable sources. Ensure that the information is accurate and formatted clearly.

Exclude any events that do not meet the criteria of being verified or are not within the specified timeframe. Focus on well-known networks and channels that are recognized for sports broadcasting.

Current UK date/time: ${ukNow.toISOString()}
Search until: ${fourWeeksFromNow.toISOString()}

Return the data as a JSON array with the following structure:
[
  {
    "title": "Event title with teams/competitors",
    "sport_type": "Sport category (e.g., Football, Rugby, Cricket, Tennis, etc.)",
    "league": "League or competition name",
    "home_team": "Home team name (if applicable, otherwise null)",
    "away_team": "Away team name (if applicable, otherwise null)",
    "start_time": "ISO 8601 datetime in UK timezone (e.g., 2025-10-25T15:00:00.000Z)",
    "channel_name": "Channel name from the list provided",
    "description": "Brief description (optional)"
  }
]

Return ONLY the JSON array with no additional text.`;

    const groqApiKey = Deno.env.get('GROQ_API_KEY');

    if (!groqApiKey) {
      throw new Error('No API key configured. Please set GROQ_API_KEY environment variable.');
    }

    console.log('Using Groq API for event generation');

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: prompt,
        }],
        temperature: 0.7,
        max_tokens: 8192,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      throw new Error(`Groq API error: ${groqResponse.statusText} - ${errorText}`);
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices[0].message.content;

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    let events = [];
    if (jsonMatch) {
      events = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse events from Groq API response');
    }

    if (events.length === 0) {
      throw new Error('No events were generated');
    }

    const eventsToInsert = events.map((event: any) => {
      const channel = channels.find(
        c => c.name.toLowerCase() === event.channel_name.toLowerCase()
      ) || channels[0];

      return {
        company_id,
        title: event.title,
        sport_type: event.sport_type,
        league: event.league,
        home_team: event.home_team || null,
        away_team: event.away_team || null,
        start_time: event.start_time,
        end_time: event.end_time || null,
        channel_id: channel.id,
        description: event.description || null,
        is_featured: false,
      };
    });

    const { data: insertedEvents, error: insertError } = await supabase
      .from('sports_events')
      .insert(eventsToInsert)
      .select();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: insertedEvents.length,
        events: insertedEvents,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});