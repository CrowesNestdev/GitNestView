import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { DOMParser } from 'npm:linkedom@0.16.6';

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

interface DataSource {
  id: string;
  url: string;
  name: string;
  is_active: boolean;
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

    const { data: dataSources, error: sourcesError } = await supabase
      .from('sports_data_sources')
      .select('*')
      .eq('company_id', company_id)
      .eq('is_active', true);

    if (sourcesError) {
      throw new Error(`Failed to fetch data sources: ${sourcesError.message}`);
    }

    if (!dataSources || dataSources.length === 0) {
      throw new Error('No active data sources found. Please add sports schedule websites in Data Sources.');
    }

    console.log(`Found ${dataSources.length} active data sources`);

    const allEvents: any[] = [];
    const now = new Date();

    for (const source of dataSources) {
      try {
        console.log(`Scraping ${source.name}: ${source.url}`);

        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
        });

        if (!response.ok) {
          console.error(`Failed to fetch ${source.url}: ${response.statusText}`);
          continue;
        }

        const html = await response.text();
        const events = await extractEventsFromHTML(html, source, channels);

        console.log(`Extracted ${events.length} events from ${source.name}`);
        allEvents.push(...events);

        await supabase
          .from('sports_data_sources')
          .update({
            last_scraped_at: new Date().toISOString(),
            scrape_count: source.scrape_count + 1,
          })
          .eq('id', source.id);

      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error);
      }
    }

    if (allEvents.length === 0) {
      throw new Error('No events could be extracted from the data sources. Please check the URLs are valid sports schedule pages.');
    }

    const eventsToInsert = allEvents.map((event: any) => {
      const channel = channels.find(
        c => c.name.toLowerCase().includes(event.channel_name.toLowerCase()) ||
            event.channel_name.toLowerCase().includes(c.name.toLowerCase())
      ) || channels[0];

      return {
        company_id,
        title: event.title,
        sport_type: event.sport_type || 'Sports',
        league: event.league || '',
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
        sources_scraped: dataSources.length,
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

async function extractEventsFromHTML(html: string, source: DataSource, channels: Channel[]): Promise<any[]> {
  const events: any[] = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const sportKeywords = [
      'football', 'soccer', 'rugby', 'cricket', 'tennis', 'golf', 'boxing',
      'basketball', 'nba', 'nfl', 'baseball', 'hockey', 'nhl', 'formula',
      'darts', 'snooker', 'ufc', 'mma', 'racing', 'premier league',
      'champions league', 'fa cup', 'world cup'
    ];

    const channelKeywords = channels.map(c => c.name.toLowerCase());

    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*(am|pm)/gi,
      /(\d{1,2})\.(\d{2})/g,
      /(\d{1,2}):(\d{2})/g
    ];

    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
      /(today|tomorrow)/gi,
      /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/gi
    ];

    const textContent = doc.body?.textContent || '';
    const hasSportsContent = sportKeywords.some(keyword =>
      textContent.toLowerCase().includes(keyword)
    );

    if (!hasSportsContent) {
      console.log(`No sports content detected in ${source.name}`);
      return events;
    }

    const allElements = doc.querySelectorAll('div, article, section, li, tr, td');

    for (const element of allElements) {
      const elementText = element.textContent || '';
      const elementHTML = element.innerHTML || '';

      const hasSportKeyword = sportKeywords.some(keyword =>
        elementText.toLowerCase().includes(keyword)
      );

      const hasChannelKeyword = channelKeywords.some(keyword =>
        elementText.toLowerCase().includes(keyword)
      );

      const hasTimePattern = timePatterns.some(pattern =>
        pattern.test(elementText)
      );

      if ((hasSportKeyword || hasChannelKeyword) && hasTimePattern) {
        const event = extractEventDetails(elementText, elementHTML, channels);
        if (event) {
          events.push(event);
        }
      }
    }

    const uniqueEvents = deduplicateEvents(events);
    console.log(`Extracted ${uniqueEvents.length} unique events from ${events.length} candidates`);

    return uniqueEvents;

  } catch (error) {
    console.error('Error parsing HTML:', error);
    return events;
  }
}

function extractEventDetails(text: string, html: string, channels: Channel[]): any | null {
  try {
    let title = '';
    let channel_name = '';
    let start_time = '';
    let sport_type = '';
    let home_team = null;
    let away_team = null;

    const vsPattern = /([A-Za-z\s]+)\s+vs?\s+([A-Za-z\s]+)/i;
    const vsMatch = text.match(vsPattern);
    if (vsMatch) {
      home_team = vsMatch[1].trim();
      away_team = vsMatch[2].trim();
      title = `${home_team} vs ${away_team}`;
    }

    for (const channel of channels) {
      if (text.toLowerCase().includes(channel.name.toLowerCase())) {
        channel_name = channel.name;
        break;
      }
    }

    if (!channel_name) {
      channel_name = channels[0]?.name || 'Unknown';
    }

    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*(am|pm)/i,
      /(\d{1,2})\.(\d{2})/,
      /(\d{1,2}):(\d{2})/
    ];

    let timeMatch = null;
    for (const pattern of timePatterns) {
      timeMatch = text.match(pattern);
      if (timeMatch) break;
    }

    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const meridiem = timeMatch[3]?.toLowerCase();

      if (meridiem === 'pm' && hours !== 12) {
        hours += 12;
      } else if (meridiem === 'am' && hours === 12) {
        hours = 0;
      }

      const now = new Date();
      const eventDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
      eventDate.setHours(hours, minutes, 0, 0);

      if (eventDate < now) {
        eventDate.setDate(eventDate.getDate() + 1);
      }

      start_time = eventDate.toISOString();
    } else {
      return null;
    }

    const sportKeywords = {
      'Football': ['football', 'premier league', 'fa cup', 'champions league', 'soccer'],
      'Rugby Union': ['rugby union', 'six nations', 'premiership rugby'],
      'Rugby League': ['rugby league', 'super league'],
      'Cricket': ['cricket', 'test match', 'odi', 't20'],
      'Tennis': ['tennis', 'wimbledon', 'atp', 'wta'],
      'Golf': ['golf', 'pga', 'masters'],
      'Boxing': ['boxing', 'fight'],
      'Basketball': ['basketball', 'nba'],
      'American Football': ['nfl', 'american football'],
      'Ice Hockey': ['hockey', 'nhl'],
      'Darts': ['darts'],
      'Snooker': ['snooker'],
      'Formula 1': ['formula 1', 'f1', 'grand prix'],
    };

    for (const [sport, keywords] of Object.entries(sportKeywords)) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        sport_type = sport;
        break;
      }
    }

    if (!sport_type) {
      sport_type = 'Sports';
    }

    if (!title) {
      const words = text.split(/\s+/).slice(0, 10).join(' ');
      title = words.substring(0, 100);
    }

    if (!title || !start_time) {
      return null;
    }

    return {
      title: title.trim(),
      sport_type,
      league: '',
      home_team,
      away_team,
      start_time,
      channel_name,
      description: null,
    };

  } catch (error) {
    console.error('Error extracting event details:', error);
    return null;
  }
}

function deduplicateEvents(events: any[]): any[] {
  const unique = new Map();

  for (const event of events) {
    const key = `${event.title}-${event.start_time}-${event.channel_name}`;
    if (!unique.has(key)) {
      unique.set(key, event);
    }
  }

  return Array.from(unique.values());
}