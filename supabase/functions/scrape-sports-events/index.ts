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

    const additionalWebsites = channels.some(c =>
      c.name.toLowerCase().includes('sky') ||
      c.name.toLowerCase().includes('bt') ||
      c.name.toLowerCase().includes('tnt')
    ) ? '' : '\n- Other relevant sports broadcast websites';

    const prompt = `Find upcoming sports fixtures that will be broadcast on UK TV channels: ${channelNames}

Search for fixtures in the next 4 weeks from today.

WHERE TO SEARCH:
- Official TV channel schedules (Sky Sports, BT Sport, TNT Sports websites)
- Premier League official fixtures page
- BBC Sport fixtures
- Official league/competition websites
- TV guide websites (RadioTimes, TVGuide)${additionalWebsites}

IMPORTANT RULES:
✓ Only include matches/events you can verify from reliable sources
✓ Include the exact date and time if found
✓ If a fixture is announced but time is TBC, skip it
✓ Focus on major events and confirmed broadcasts
✗ Don't invent events that don't exist
✗ Don't guess at dates or times

SPORTS TO INCLUDE:
- Football (Premier League, Champions League, FA Cup, etc.)
- Rugby (Premiership, Six Nations, etc.)
- Cricket (international matches, The Hundred, etc.)
- Tennis (tournaments, Grand Slams)
- Formula 1 (race weekends)
- Boxing (major fights)
- Golf (tournaments)

For each event provide:
- title: Title with teams/competitors
- sport_type: Sport type
- league: League/competition name
- home_team: Home team (if applicable)
- away_team: Away team (if applicable)
- start_time: Start date and time (YYYY-MM-DDTHH:MM:SS format in UK time, ISO 8601)
- channel_name: Channel name
- description: Brief description (optional)

Return as many REAL events as you can find. It's okay to return 0 events if you can't find any confirmed broadcasts.

Current UK date/time: ${ukNow.toISOString()}
Search until: ${fourWeeksFromNow.toISOString()}

Return ONLY a JSON array of events with no additional text.

Example format:
[
  {
    "title": "Premier League: Arsenal vs Liverpool",
    "sport_type": "Football",
    "league": "Premier League",
    "home_team": "Arsenal",
    "away_team": "Liverpool",
    "start_time": "2025-10-25T15:00:00.000Z",
    "channel_name": "Sky Sports",
    "description": "Top of the table clash at the Emirates"
  }
]`;

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