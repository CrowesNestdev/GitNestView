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
    
    console.log('Generating realistic sports events using mock data generator');
    const events = generateMockEvents(channels, ukNow, fourWeeksFromNow);

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
    { 
      type: 'Football', 
      leagues: ['Premier League', 'Championship', 'Champions League', 'La Liga', 'Serie A', 'Bundesliga'],
      weight: 3,
      times: {
        saturday: ['12:30', '15:00', '17:30'],
        sunday: ['14:00', '16:30'],
        weekday: ['19:45', '20:00']
      }
    },
    { 
      type: 'Rugby Union', 
      leagues: ['Premiership Rugby', 'Six Nations', 'European Champions Cup', 'United Rugby Championship'],
      weight: 2,
      times: {
        saturday: ['15:00', '17:30'],
        friday: ['19:45'],
        sunday: ['15:00']
      }
    },
    { 
      type: 'Rugby League', 
      leagues: ['Super League', 'NRL', 'Challenge Cup'],
      weight: 1,
      times: {
        friday: ['19:45'],
        saturday: ['15:00'],
        sunday: ['15:00']
      }
    },
    { 
      type: 'Cricket', 
      leagues: ['County Championship', 'The Hundred', 'T20 Blast', 'Test Match', 'ODI'],
      weight: 2,
      times: {
        weekday: ['11:00', '18:30'],
        weekend: ['11:00', '14:30']
      }
    },
    { 
      type: 'Darts', 
      leagues: ['Premier League Darts', 'PDC World Championship', 'European Tour'],
      weight: 1,
      times: {
        weekday: ['19:00', '20:00'],
        weekend: ['19:00']
      }
    },
    { 
      type: 'Snooker', 
      leagues: ['World Championship', 'UK Championship', 'Masters'],
      weight: 1,
      times: {
        weekday: ['13:00', '19:00'],
        weekend: ['13:00', '19:00']
      }
    },
    { 
      type: 'Formula 1', 
      leagues: ['Formula 1 World Championship'],
      weight: 1,
      times: {
        sunday: ['14:00', '15:00']
      }
    },
    { 
      type: 'Tennis', 
      leagues: ['ATP Tour', 'WTA Tour', 'Grand Slam'],
      weight: 1,
      times: {
        weekday: ['12:00', '18:00'],
        weekend: ['13:00']
      }
    },
    { 
      type: 'Boxing', 
      leagues: ['World Title Fight', 'British Title Fight', 'European Title Fight'],
      weight: 1,
      times: {
        saturday: ['22:00'],
        sunday: ['02:00']
      }
    },
    { 
      type: 'Golf', 
      leagues: ['PGA Tour', 'European Tour', 'The Open'],
      weight: 1,
      times: {
        weekend: ['13:00', '18:00']
      }
    },
    { 
      type: 'Basketball', 
      leagues: ['NBA', 'EuroLeague'],
      weight: 1,
      times: {
        weekday: ['00:30', '01:00', '03:00'],
        weekend: ['20:00', '00:30']
      }
    },
    { 
      type: 'American Football', 
      leagues: ['NFL'],
      weight: 1,
      times: {
        sunday: ['18:00', '21:25'],
        monday: ['01:20']
      }
    },
    { 
      type: 'Ice Hockey', 
      leagues: ['NHL'],
      weight: 1,
      times: {
        weekday: ['00:00', '02:00'],
        weekend: ['23:00', '01:30']
      }
    },
  ];

  const teams: Record<string, string[]> = {
    'Premier League': ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester United', 'Manchester City', 'Tottenham', 'Newcastle', 'Aston Villa'],
    'Championship': ['Leeds United', 'Leicester City', 'Southampton', 'West Brom', 'Norwich', 'Sheffield United'],
    'Premiership Rugby': ['Leicester Tigers', 'Saracens', 'Northampton Saints', 'Harlequins', 'Sale Sharks', 'Bath', 'Exeter Chiefs', 'Gloucester'],
    'Super League': ['St Helens', 'Wigan Warriors', 'Leeds Rhinos', 'Warrington Wolves', 'Catalans Dragons', 'Hull FC'],
    'County Championship': ['Yorkshire', 'Lancashire', 'Surrey', 'Middlesex', 'Hampshire', 'Warwickshire'],
    'NBA': ['Lakers', 'Warriors', 'Celtics', 'Heat', 'Bucks', 'Nets', 'Suns', 'Mavericks'],
    'NFL': ['Patriots', 'Chiefs', 'Packers', '49ers', 'Cowboys', 'Steelers'],
  };

  const weightedSports: any[] = [];
  sports.forEach(sport => {
    for (let i = 0; i < sport.weight; i++) {
      weightedSports.push(sport);
    }
  });

  let currentDate = new Date(startDate);
  
  while (currentDate < endDate) {
    const dayOfWeek = currentDate.getDay();
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const isFriday = dayOfWeek === 5;
    const isMonday = dayOfWeek === 1;
    const isWeekend = isSaturday || isSunday;
    const eventsPerDay = isWeekend ? 5 : 2;
    
    for (let i = 0; i < eventsPerDay; i++) {
      const sport = weightedSports[Math.floor(Math.random() * weightedSports.length)];
      const league = sport.leagues[Math.floor(Math.random() * sport.leagues.length)];
      const channel = channels[Math.floor(Math.random() * channels.length)];
      
      let timeOptions = [];
      if (isSaturday && sport.times.saturday) {
        timeOptions = sport.times.saturday;
      } else if (isSunday && sport.times.sunday) {
        timeOptions = sport.times.sunday;
      } else if (isFriday && sport.times.friday) {
        timeOptions = sport.times.friday;
      } else if (isMonday && sport.times.monday) {
        timeOptions = sport.times.monday;
      } else if (isWeekend && sport.times.weekend) {
        timeOptions = sport.times.weekend;
      } else if (!isWeekend && sport.times.weekday) {
        timeOptions = sport.times.weekday;
      } else {
        timeOptions = ['19:00'];
      }
      
      const selectedTime = timeOptions[Math.floor(Math.random() * timeOptions.length)];
      const [hours, minutes] = selectedTime.split(':').map(Number);
      
      const eventTime = new Date(currentDate);
      eventTime.setHours(hours, minutes, 0, 0);
      
      let homeTeam = null;
      let awayTeam = null;
      let title = `${league} Event`;
      
      if (teams[league]) {
        const teamList = teams[league];
        homeTeam = teamList[Math.floor(Math.random() * teamList.length)];
        awayTeam = teamList.filter(t => t !== homeTeam)[Math.floor(Math.random() * (teamList.length - 1))];
        title = `${league}: ${homeTeam} vs ${awayTeam}`;
      } else if (sport.type === 'Darts') {
        title = `${league}: Night ${Math.floor(Math.random() * 16) + 1}`;
      } else if (sport.type === 'Snooker') {
        title = `${league}: Quarter Final ${Math.floor(Math.random() * 4) + 1}`;
      } else if (sport.type === 'Formula 1') {
        const races = ['British GP', 'Monaco GP', 'Italian GP', 'Belgian GP', 'Spanish GP', 'Austrian GP'];
        title = `Formula 1: ${races[Math.floor(Math.random() * races.length)]}`;
      } else if (sport.type === 'Golf') {
        title = `${league}: Round ${Math.floor(Math.random() * 4) + 1}`;
      } else if (sport.type === 'Tennis') {
        title = `${league}: ${['Quarter Final', 'Semi Final', 'Final'][Math.floor(Math.random() * 3)]}`;
      } else if (sport.type === 'Boxing') {
        title = `${league}: Heavyweight Championship`;
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