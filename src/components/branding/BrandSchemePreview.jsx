import React from "react";
import { Calendar, Clock, Tv } from "lucide-react";

export default function BrandSchemePreview({ scheme }) {
  const demoEvents = [
    {
      time: "12:30",
      date: "Oct 22",
      title: "Premier League: Arsenal vs Chelsea",
      channel: "Sky Sports",
      sport: "football"
    },
    {
      time: "19:45",
      date: "Oct 22",
      title: "Champions League: Real Madrid vs Bayern",
      channel: "BT Sport",
      sport: "football",
      hasSound: true
    }
  ];

  return (
    <div 
      className="rounded-xl p-6 min-h-[500px]"
      style={{ 
        backgroundImage: `linear-gradient(to bottom right, ${scheme.background_start || '#1f2937'}, ${scheme.background_end || '#1e3a8a'})`,
        backgroundColor: scheme.background_start || '#1f2937'
      }}
    >
      <div className="text-center mb-8">
        <div 
          className="inline-block rounded-2xl p-4"
          style={{ 
            border: `4px solid ${scheme.border_color || '#06b6d4'}`,
            backgroundColor: `${scheme.background_start || '#1f2937'}80`
          }}
        >
          <h1 className="text-3xl font-bold" style={{ color: scheme.text_color || '#ffffff' }}>
            <span style={{ color: scheme.primary_color || '#10b981' }}>SPORTS</span>
            <span> SCHEDULE</span>
          </h1>
          <p className="text-lg mt-1" style={{ color: `${scheme.text_color || '#ffffff'}CC` }}>
            Demo Site
          </p>
        </div>
      </div>

      <div 
        className="inline-block mb-4 px-6 py-3 rounded-r-xl"
        style={{ 
          borderLeft: `8px solid ${scheme.primary_color || '#10b981'}`,
          backgroundColor: `${scheme.primary_color || '#10b981'}33`
        }}
      >
        <h2 className="text-2xl font-bold" style={{ color: scheme.text_color || '#ffffff' }}>
          TODAY
        </h2>
      </div>

      <div className="space-y-4">
        {demoEvents.map((event, idx) => (
          <div key={idx} className="flex items-center gap-4">
            <div 
              className="px-4 py-3 rounded-xl min-w-[100px] text-center"
              style={{ 
                backgroundColor: scheme.primary_color || '#10b981',
                color: scheme.text_color || '#ffffff'
              }}
            >
              <div className="text-2xl font-bold">{event.time}</div>
              <div className="text-xs opacity-90">{event.date}</div>
            </div>
            <div 
              className="flex-1 p-4 rounded-xl"
              style={{ 
                backgroundColor: `${scheme.text_color || '#ffffff'}1A`,
                border: `1px solid ${scheme.border_color || '#06b6d4'}33`
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-bold text-lg leading-tight" style={{ color: scheme.text_color || '#ffffff' }}>
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2" style={{ color: `${scheme.text_color || '#ffffff'}CC` }}>
                    <Tv className="w-4 h-4" />
                    <span className="font-semibold">{event.channel}</span>
                  </div>
                </div>
                {event.hasSound && (
                  <div 
                    className="px-3 py-1 rounded-lg text-xs font-bold"
                    style={{ 
                      backgroundColor: scheme.secondary_color || '#3b82f6',
                      color: scheme.text_color || '#ffffff'
                    }}
                  >
                    🔊 SOUND ON
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}