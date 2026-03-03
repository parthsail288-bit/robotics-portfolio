import React, { useState, useEffect, useMemo } from 'react';

interface NewsItem {
  text: string;
  source: string;
  url: string;
  isFact?: boolean;
}

interface RoboticsTickerProps {
  isBlueprint?: boolean;
}

export const RoboticsTicker: React.FC<RoboticsTickerProps> = ({ isBlueprint = false }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fallbackFacts: NewsItem[] = useMemo(() => [
    { text: "India’s industrial robot density is increasing at a 20% CAGR.", source: "Industry Report", url: "https://ifr.org/ifr-press-releases/news/world-robotics-report-2023", isFact: true },
    { text: "ISRO's Vyommitra represents a major milestone in Indian humanoid robotics.", source: "ISRO", url: "https://www.isro.gov.in/Vyommitra.html", isFact: true },
    { text: "New 6-Axis manipulator path planning algorithm reduces cycle time by 15%.", source: "R&D Lab", url: "https://ieeexplore.ieee.org/search/searchresult.jsp?newsearch=true&queryText=6-axis%20manipulator%20path%20planning", isFact: true },
    { text: "Warehouse automation startups in Bangalore secure record funding for AMR development.", source: "Tech News", url: "https://yourstory.com/search?q=warehouse%20automation", isFact: true },
    { text: "DRDO announces advanced actuators for next-gen defense automation systems.", source: "DRDO", url: "https://www.drdo.gov.in/drdo/whats-new", isFact: true },
    { text: "PLC/SCADA integration with Industrial AI reaches 99.9% uptime in pilot tests.", source: "Automation Weekly", url: "https://www.automation.com/", isFact: true }
  ], []);

  useEffect(() => {
    const fetchAutomationNews = async () => {
      setIsLoading(true);
      try {
        // Simulating API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const mockHeadlines: NewsItem[] = [
          { text: "IEEE Spectrum: New soft robotic grippers handle delicate electronics with precision.", source: "IEEE Spectrum", url: "https://spectrum.ieee.org/robotics" },
          { text: "The Robot Report: Global AMR market expected to double by 2027.", source: "The Robot Report", url: "https://www.therobotreport.com/" },
          { text: "Robotics Business Review: AI-based path planning becomes standard in automotive assembly.", source: "RBR", url: "https://www.roboticsbusinessreview.com/" },
          { text: "ISRO: Space robotics division testing new lunar rover mobility systems.", source: "ISRO", url: "https://www.isro.gov.in/" },
          { text: "DRDO: Successful field trials of autonomous surveillance UGV.", source: "DRDO", url: "https://www.drdo.gov.in/" }
        ];

        setNews([...mockHeadlines, ...fallbackFacts]);
      } catch (error) {
        console.error("Failed to fetch robotics news:", error);
        setNews(fallbackFacts);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAutomationNews();
    
    const interval = setInterval(fetchAutomationNews, 1800000);
    return () => clearInterval(interval);
  }, [fallbackFacts]);

  const TickerItems = () => (
    <>
      {isLoading && news.length === 0 ? (
        <span className="px-4">INITIALIZING_ROBOTICS_FEED...</span>
      ) : (
        news.map((item, idx) => (
          <a 
            key={`${item.source}-${idx}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 hover:underline transition-all inline-flex items-center gap-2"
          >
            <span className={isBlueprint ? "text-white/60" : "text-neon/60"}>[{item.source.toUpperCase()}]</span>
            <span>{item.text}</span>
            <span className="mx-2 opacity-30">•</span>
          </a>
        ))
      )}
    </>
  );

  return (
    <div 
      className={`fixed bottom-0 left-0 w-full h-8 z-[100] border-t transition-colors duration-500 flex items-center overflow-hidden font-mono text-[10px] uppercase tracking-widest
        ${isBlueprint 
          ? 'bg-[#002b55] border-white/30 text-white' 
          : 'bg-black/80 backdrop-blur-md border-neon/50 text-neon'
        }`}
    >
      {/* Label */}
      <div className={`px-4 h-full flex items-center font-bold border-r whitespace-nowrap z-10
        ${isBlueprint ? 'bg-white/10 border-white/20' : 'bg-neon/10 border-neon/20'}`}>
        <span className="animate-pulse mr-2">●</span>
        LIVE_ROBOTICS_FEED
      </div>

      {/* Ticker Track */}
      <div className="flex-grow overflow-hidden relative h-full flex items-center">
        <div className="ticker-track whitespace-nowrap hover:pause-animation flex items-center">
          <TickerItems />
          <TickerItems /> {/* Duplicate for seamless loop */}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .ticker-track {
          display: inline-block;
          animation: ticker 60s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
};
