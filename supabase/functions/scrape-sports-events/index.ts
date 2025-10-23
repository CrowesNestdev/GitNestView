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

    const prompt = `Generate a realistic and diverse international sports schedule for the next 4 weeks for these TV channels: ${channelNames}.

IMPORTANT: All times must be in UK timezone (GMT/BST). Use proper UK scheduling patterns.

Include a DIVERSE MIX of UK, European, and International sports:

UK & European Sports (PRIORITY):
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

International Sports:
- Basketball: NBA, EuroLeague
- American Football: NFL
- Ice Hockey: NHL
- Baseball: MLB
- UFC/MMA events

For each event, provide:
- title: Full descriptive title
- sport_type: Type of sport (e.g., Football, Rugby Union, Cricket, Darts, Snooker, etc.)
- league: League/competition name
- home_team: Home team name (if applicable)
- away_team: Away team name (if applicable)
- start_time: ISO datetime string in UK timezone
- channel_name: Which channel will broadcast it
- description: Brief event description (optional)

IMPORTANT:
- Generate 80-120 events total
- 60% should be UK/European sports
- 40% international sports
- ALL TIMES IN UK TIMEZONE (GMT/BST)
- Realistic UK scheduling:
  * Football: Saturdays 12:30pm, 3pm, 5:30pm; Sundays 2pm, 4:30pm; Midweek 7:45pm, 8pm
  * Rugby: Saturdays 3pm, 5:30pm; Fridays 7:45pm
  * Cricket: Day matches 11am; Evening 6:30pm
  * Darts/Snooker: Evening 7pm-9pm
  * NFL (converted to UK time): Sunday evenings 6pm, 9:25pm; Monday 1:20am
  * NBA (converted to UK time): Late night 12:30am-3am
- More events on weekends
- Vary the channels appropriately

Return ONLY a JSON array of events with no additional text.

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