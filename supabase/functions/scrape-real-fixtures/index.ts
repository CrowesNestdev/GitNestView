import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

interface SportsEvent {
  title: string;
  sport_type: string;
  league: string;
  home_team: string | null;
  away_team: string | null;
  start_time: string;
  channel_name: string;
  description?: string;
}

async function scrapeTheSportsDBTVSchedule(): Promise<SportsEvent[]> {
  const events: SportsEvent[] = [];

  try {
    const today = new Date();
    const daysToFetch = 28;

    for (let i = 0; i < daysToFetch; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const url = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${dateStr}&s=Soccer`;

      try {
        const response = await fetch(url);

        if (!response.ok) {
          console.error(`TheSportsDB fetch failed for ${dateStr}:`, response.status);
          continue;
        }

        const data = await response.json();

        if (data.events) {
          data.events.forEach((event: any) => {
            if (event.strCountry === 'United Kingdom' && event.strChannel) {
              const eventDate = new Date(`${event.dateEvent}T${event.strTime || '15:00:00'}`);

              const sportType = event.strSport === 'Soccer' ? 'Football' :
                               event.strSport === 'Rugby' ? 'Rugby' :
                               event.strSport;

              events.push({
                title: event.strEvent || `${event.strHomeTeam || 'TBD'} vs ${event.strAwayTeam || 'TBD'}`,
                sport_type: sportType,
                league: event.strLeague || 'Unknown League',
                home_team: event.strHomeTeam || null,
                away_team: event.strAwayTeam || null,
                start_time: eventDate.toISOString(),
                channel_name: event.strChannel,
                description: event.strLeague
              });
            }
          });
        }
      } catch (dayError) {
        console.error(`Error fetching events for ${dateStr}:`, dayError);
      }

      if (i % 7 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  } catch (error) {
    console.error('Error scraping TheSportsDB TV schedule:', error);
  }

  return events;
}

async function scrapeAPIFootball(apiKey: string): Promise<SportsEvent[]> {
  const events: SportsEvent[] = [];

  if (!apiKey) {
    console.log('No API-Football key provided, skipping');
    return events;
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const fourWeeks = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures?league=39&season=2024&from=${today}&to=${fourWeeks}`,
      {
        headers: {
          'x-apisports-key': apiKey
        }
      }
    );

    if (!response.ok) {
      console.error('API-Football fetch failed:', response.status);
      return events;
    }

    const data = await response.json();

    if (data.response) {
      data.response.forEach((fixture: any) => {
        events.push({
          title: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
          sport_type: 'Football',
          league: fixture.league.name,
          home_team: fixture.teams.home.name,
          away_team: fixture.teams.away.name,
          start_time: new Date(fixture.fixture.date).toISOString(),
          channel_name: 'Sky Sports',
          description: `${fixture.league.name} - Round ${fixture.league.round}`
        });
      });
    }
  } catch (error) {
    console.error('Error scraping API-Football:', error);
  }

  return events;
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

    console.log('Starting real fixture scraping from TheSportsDB TV schedule...');

    const allEvents: SportsEvent[] = [];

    const apiFootballKey = Deno.env.get('API_FOOTBALL_KEY');
    if (apiFootballKey) {
      console.log('Scraping API-Football...');
      const apiFootballEvents = await scrapeAPIFootball(apiFootballKey);
      allEvents.push(...apiFootballEvents);
    }

    console.log('Scraping TheSportsDB TV schedule (UK channels only)...');
    const tvScheduleEvents = await scrapeTheSportsDBTVSchedule();
    allEvents.push(...tvScheduleEvents);

    if (allEvents.length === 0) {
      throw new Error('No events found from any source');
    }

    const uniqueEvents = Array.from(
      new Map(allEvents.map(event => [
        `${event.home_team}-${event.away_team}-${event.start_time}`,
        event
      ])).values()
    );

    console.log(`Found ${uniqueEvents.length} unique events`);

    const eventsToInsert = uniqueEvents.map((event) => {
      const channelName = event.channel_name.toLowerCase();

      const channel = channels.find(c => {
        const cName = c.name.toLowerCase();
        return cName.includes(channelName) ||
               channelName.includes(cName) ||
               (channelName.includes('sky') && cName.includes('sky')) ||
               (channelName.includes('bt') && cName.includes('bt')) ||
               (channelName.includes('tnt') && cName.includes('tnt')) ||
               (channelName.includes('bbc') && cName.includes('bbc'));
      }) || channels[0];

      return {
        company_id,
        title: event.title,
        sport_type: event.sport_type,
        league: event.league,
        home_team: event.home_team,
        away_team: event.away_team,
        start_time: event.start_time,
        end_time: null,
        channel_id: channel.id,
        description: event.description || null,
        is_featured: false,
      };
    });

    const { data: existingEvents } = await supabase
      .from('sports_events')
      .select('title, start_time, home_team, away_team')
      .eq('company_id', company_id);

    const existingSet = new Set(
      (existingEvents || []).map(e =>
        `${e.title}-${e.start_time}-${e.home_team}-${e.away_team}`
      )
    );

    const newEvents = eventsToInsert.filter(event => {
      const key = `${event.title}-${event.start_time}-${event.home_team}-${event.away_team}`;
      return !existingSet.has(key);
    });

    if (newEvents.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          count: 0,
          message: 'All events already exist, no duplicates added',
          sources: {
            api_football: apiFootballKey ? 'used' : 'not configured',
            thesportsdb_tv: 'used'
          }
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { data: insertedEvents, error: insertError } = await supabase
      .from('sports_events')
      .insert(newEvents)
      .select();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: insertedEvents.length,
        events: insertedEvents,
        sources: {
          api_football: apiFootballKey ? 'used' : 'not configured',
          thesportsdb_tv: 'used'
        }
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
