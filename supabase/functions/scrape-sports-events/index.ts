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
    const fourWeeksFromNow = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

    const channelNames = channels.map(c => c.name).join(', ');
    
    const prompt = `Generate a realistic sports schedule for the next 4 weeks for these TV channels: ${channelNames}.

Include major sports like Football (Soccer), Basketball (NBA), American Football (NFL), Baseball (MLB), Ice Hockey (NHL), Rugby, Tennis, Golf, Boxing/MMA, Cricket, and others.

For each event, provide:
- title: Full descriptive title
- sport_type: Type of sport
- league: League/competition name
- home_team: Home team name (if applicable)
- away_team: Away team name (if applicable)
- start_time: ISO datetime string
- channel_name: Which channel will broadcast it

Return ONLY a JSON array of events with no additional text. Make it realistic with proper scheduling (weekends have more games, prime time slots, etc.).

Current date: ${now.toISOString()}
End date: ${fourWeeksFromNow.toISOString()}

Example format:
[
  {
    "title": "Premier League: Manchester United vs Liverpool",
    "sport_type": "Football",
    "league": "Premier League",
    "home_team": "Manchester United",
    "away_team": "Liverpool",
    "start_time": "${new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()}",
    "channel_name": "Sky Sports"
  }
]`;

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    
    let events = [];
    
    if (anthropicApiKey) {
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: prompt,
          }],
        }),
      });

      if (!anthropicResponse.ok) {
        throw new Error(`Anthropic API error: ${anthropicResponse.statusText}`);
      }

      const anthropicData = await anthropicResponse.json();
      const content = anthropicData.content[0].text;
      
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        events = JSON.parse(jsonMatch[0]);
      }
    } else {
      events = generateMockEvents(channels, now, fourWeeksFromNow);
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

function generateMockEvents(channels: Channel[], startDate: Date, endDate: Date) {
  const events = [];
  const sports = [
    { type: 'Football', leagues: ['Premier League', 'La Liga', 'Serie A', 'Bundesliga'] },
    { type: 'Basketball', leagues: ['NBA', 'EuroLeague'] },
    { type: 'American Football', leagues: ['NFL'] },
    { type: 'Ice Hockey', leagues: ['NHL'] },
    { type: 'Tennis', leagues: ['ATP Tour', 'WTA Tour'] },
  ];

  const teams = {
    'Premier League': ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester United', 'Manchester City', 'Tottenham'],
    'NBA': ['Lakers', 'Warriors', 'Celtics', 'Heat', 'Bucks', 'Nets'],
    'NFL': ['Patriots', 'Chiefs', 'Packers', '49ers', 'Cowboys', 'Steelers'],
  };

  let currentDate = new Date(startDate);
  
  while (currentDate < endDate) {
    const eventsPerDay = currentDate.getDay() === 0 || currentDate.getDay() === 6 ? 5 : 2;
    
    for (let i = 0; i < eventsPerDay; i++) {
      const sport = sports[Math.floor(Math.random() * sports.length)];
      const league = sport.leagues[Math.floor(Math.random() * sport.leagues.length)];
      const channel = channels[Math.floor(Math.random() * channels.length)];
      
      const hour = 14 + Math.floor(Math.random() * 8);
      const eventTime = new Date(currentDate);
      eventTime.setHours(hour, 0, 0, 0);
      
      let homeTeam = null;
      let awayTeam = null;
      let title = `${league} Match`;
      
      if (teams[league]) {
        const teamList = teams[league];
        homeTeam = teamList[Math.floor(Math.random() * teamList.length)];
        awayTeam = teamList.filter(t => t !== homeTeam)[Math.floor(Math.random() * (teamList.length - 1))];
        title = `${league}: ${homeTeam} vs ${awayTeam}`;
      }
      
      events.push({
        title,
        sport_type: sport.type,
        league,
        home_team: homeTeam,
        away_team: awayTeam,
        start_time: eventTime.toISOString(),
        channel_name: channel.name,
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return events;
}