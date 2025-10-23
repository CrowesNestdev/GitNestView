import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { DOMParser } from 'npm:linkedom@0.18.4';

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

async function scrapeBBCSportFootball(): Promise<SportsEvent[]> {
  const events: SportsEvent[] = [];

  try {
    const response = await fetch('https://www.bbc.com/sport/football/scores-fixtures', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.error('BBC Sport fetch failed:', response.status);
      return events;
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const fixtures = doc.querySelectorAll('[data-testid*="fixture"]');

    fixtures.forEach((fixture: any) => {
      try {
        const homeTeam = fixture.querySelector('[data-testid*="home-team"]')?.textContent?.trim();
        const awayTeam = fixture.querySelector('[data-testid*="away-team"]')?.textContent?.trim();
        const dateElement = fixture.querySelector('[data-testid*="date"]');
        const timeElement = fixture.querySelector('[data-testid*="time"]');

        if (homeTeam && awayTeam && dateElement) {
          const dateStr = dateElement.textContent?.trim();
          const timeStr = timeElement?.textContent?.trim() || '15:00';

          events.push({
            title: `${homeTeam} vs ${awayTeam}`,
            sport_type: 'Football',
            league: 'Premier League',
            home_team: homeTeam,
            away_team: awayTeam,
            start_time: new Date().toISOString(),
            channel_name: 'Sky Sports',
            description: 'Premier League fixture'
          });
        }
      } catch (err) {
        console.error('Error parsing fixture:', err);
      }
    });
  } catch (error) {
    console.error('Error scraping BBC Sport:', error);
  }

  return events;
}

async function scrapeTheSportsDB(sport: string, league: string): Promise<SportsEvent[]> {
  const events: SportsEvent[] = [];

  try {
    const leagueIds: { [key: string]: string } = {
      'Premier League': '4328',
      'Champions League': '4480',
      'Rugby Premiership': '4391',
    };

    const leagueId = leagueIds[league];
    if (!leagueId) return events;

    const url = `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${leagueId}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('TheSportsDB fetch failed:', response.status);
      return events;
    }

    const data = await response.json();

    if (data.events) {
      data.events.forEach((event: any) => {
        const eventDate = new Date(`${event.dateEvent}T${event.strTime || '15:00:00'}`);
        const now = new Date();
        const fourWeeksFromNow = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

        if (eventDate >= now && eventDate <= fourWeeksFromNow) {
          let detectedSport = event.strSport || sport;
          if (detectedSport === 'Soccer') {
            detectedSport = 'Football';
          }

          events.push({
            title: `${event.strHomeTeam} vs ${event.strAwayTeam}`,
            sport_type: detectedSport,
            league: event.strLeague,
            home_team: event.strHomeTeam,
            away_team: event.strAwayTeam,
            start_time: eventDate.toISOString(),
            channel_name: 'Sky Sports',
            description: event.strLeague
          });
        }
      });
    }

    console.log(`TheSportsDB returned ${events.length} events for ${league}`);
  } catch (error) {
    console.error(`Error scraping TheSportsDB for ${league}:`, error);
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

    console.log('Starting real fixture scraping...');

    const allEvents: SportsEvent[] = [];

    const apiFootballKey = Deno.env.get('API_FOOTBALL_KEY');
    if (apiFootballKey) {
      console.log('Scraping API-Football...');
      const apiFootballEvents = await scrapeAPIFootball(apiFootballKey);
      console.log(`API-Football returned ${apiFootballEvents.length} events`);
      allEvents.push(...apiFootballEvents);
    }

    console.log('Scraping TheSportsDB for Premier League...');
    const plEvents = await scrapeTheSportsDB('Football', 'Premier League');
    console.log(`Premier League events: ${plEvents.length}`);
    allEvents.push(...plEvents);

    console.log('Scraping TheSportsDB for Champions League...');
    const clEvents = await scrapeTheSportsDB('Football', 'Champions League');
    console.log(`Champions League events: ${clEvents.length}`);
    allEvents.push(...clEvents);

    console.log('Scraping TheSportsDB for Rugby Premiership...');
    const rugbyEvents = await scrapeTheSportsDB('Rugby', 'Rugby Premiership');
    console.log(`Rugby events: ${rugbyEvents.length}`);
    allEvents.push(...rugbyEvents);

    console.log(`Total events before deduplication: ${allEvents.length}`);

    if (allEvents.length === 0) {
      throw new Error('No events found from any source');
    }

    const eventChannelMap = new Map<string, { event: SportsEvent; channels: Set<string> }>();

    allEvents.forEach(event => {
      const key = `${event.home_team}-${event.away_team}-${event.start_time}`;

      if (!eventChannelMap.has(key)) {
        eventChannelMap.set(key, {
          event,
          channels: new Set()
        });
      }

      const channel = channels.find(
        c => c.name.toLowerCase().includes('sky') || c.name.toLowerCase().includes('sport')
      ) || channels[0];

      eventChannelMap.get(key)!.channels.add(channel.id);
    });

    console.log(`Found ${eventChannelMap.size} unique events`);

    const eventsToInsert = Array.from(eventChannelMap.values()).map(({ event }) => ({
      company_id,
      title: event.title,
      sport_type: event.sport_type,
      league: event.league,
      home_team: event.home_team,
      away_team: event.away_team,
      start_time: event.start_time,
      end_time: null,
      channel_id: null,
      description: event.description || null,
      is_featured: false,
    }));

    const { data: insertedEvents, error: insertError } = await supabase
      .from('sports_events')
      .insert(eventsToInsert)
      .select();

    if (insertError) {
      throw insertError;
    }

    const eventChannelInserts = [];
    insertedEvents.forEach((insertedEvent, index) => {
      const eventData = Array.from(eventChannelMap.values())[index];
      eventData.channels.forEach(channelId => {
        eventChannelInserts.push({
          event_id: insertedEvent.id,
          channel_id: channelId
        });
      });
    });

    const { error: channelInsertError } = await supabase
      .from('event_channels')
      .insert(eventChannelInserts);

    if (channelInsertError) {
      console.error('Error inserting event channels:', channelInsertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: insertedEvents.length,
        events: insertedEvents,
        sources: {
          api_football: apiFootballKey ? 'used' : 'not configured',
          thesportsdb: 'used'
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