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

    const prompt = `Generate 80-120 sports events for the next 4 weeks based on these TV channels: ${channelNames}.

Create a diverse schedule with UK, European, and International sports:

UK & European Sports (60% of events):
- Football: Premier League, Championship, EFL Cup, FA Cup, Champions League, Europa League, La Liga, Serie A, Bundesliga, Ligue 1
- Rugby Union: Six Nations, Premiership Rugby, European Champions Cup, United Rugby Championship
- Rugby League: Super League, Challenge Cup, NRL
- Cricket: County Championship, The Hundred, T20 Blast, Test Matches, ODI, IPL
- Darts: PDC World Championship, Premier League Darts
- Snooker: World Championship, UK Championship, Masters
- Golf: The Open, European Tour, Ryder Cup
- Boxing: British & European title fights
- Horse Racing: Cheltenham, Royal Ascot, Grand National
- Formula 1: Grand Prix races
- Tennis: Wimbledon, ATP/WTA Tours

International Sports (40% of events):
- Basketball: NBA, EuroLeague
- American Football: NFL
- Ice Hockey: NHL
- Baseball: MLB
- UFC/MMA events

For each event provide:
- title: Full descriptive title (e.g., "Premier League: Arsenal vs Liverpool")
- sport_type: Sport name (e.g., "Football", "Rugby Union", "Cricket", "Darts")
- league: League/competition name
- home_team: Home team (if applicable)
- away_team: Away team (if applicable)
- start_time: ISO datetime string in UK timezone
- channel_name: One of these channels: ${channelNames}
- description: Brief description (optional)

Requirements:
- ALL times in UK timezone (GMT/BST)
- Use realistic UK TV scheduling patterns:
  * Football: Saturdays 12:30pm, 3pm, 5:30pm; Sundays 2pm, 4:30pm; Midweek 7:45pm, 8pm
  * Rugby: Saturdays 3pm, 5:30pm; Fridays 7:45pm
  * Cricket: 11am or 6:30pm
  * Darts/Snooker: 7pm-9pm
  * NFL: Sunday 6pm, 9:25pm; Monday 1:20am (UK time)
  * NBA: 12:30am-3am (UK time)
- More events on weekends
- Distribute events across all channels

Return ONLY a JSON array with no additional text.

Current UK date/time: ${ukNow.toISOString()}
End date: ${fourWeeksFromNow.toISOString()}

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
  },
  {
    "title": "Premiership Rugby: Leicester Tigers vs Saracens",
    "sport_type": "Rugby Union",
    "league": "Premiership Rugby",
    "home_team": "Leicester Tigers",
    "away_team": "Saracens",
    "start_time": "2025-10-26T15:00:00.000Z",
    "channel_name": "BT Sport"
  },
  {
    "title": "PDC Premier League Darts: Night 5",
    "sport_type": "Darts",
    "league": "Premier League Darts",
    "start_time": "2025-10-27T19:00:00.000Z",
    "channel_name": "Sky Sports"
  }
]`;

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicApiKey) {
      throw new Error('No API key configured. Please set ANTHROPIC_API_KEY environment variable.');
    }

    console.log('Using Claude API for event generation');

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      throw new Error(`Claude API error: ${anthropicResponse.statusText} - ${errorText}`);
    }

    const anthropicData = await anthropicResponse.json();
    const content = anthropicData.content[0].text;

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    let events = [];
    if (jsonMatch) {
      events = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse events from Claude API response');
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