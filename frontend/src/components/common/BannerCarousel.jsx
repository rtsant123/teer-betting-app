import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { bannerService } from '../../services/banner';
import { useNavigate } from 'react-router-dom';
const BannerCarousel = () => {
  const [banners, setBanners] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  // Default banners if no banners from database
  const defaultBanners = [
    {
      id: 'default-1',
      title: "",
      description: "",
      background_color: "#10B981",
      text_color: "#FFFFFF",
      button_text: "",
      link_url: "/home?mode=play",
      image_url: "https://via.placeholder.com/800x200/10B981/FFFFFF?text=Play+Now"
    },
    {
      id: 'default-2',
      title: "",
      description: "",
      background_color: "#8B5CF6",
      text_color: "#FFFFFF",
      button_text: "",
      link_url: "/houses",
      image_url: "https://via.placeholder.com/800x200/8B5CF6/FFFFFF?text=View+Games"
    },
    {
      id: 'default-3',
      title: "",
      description: "",
      background_color: "#3B82F6",
      text_color: "#FFFFFF",
      button_text: "",
      link_url: "/results",
      image_url: "https://via.placeholder.com/800x200/3B82F6/FFFFFF?text=Results"
    }
  ];
  useEffect(() => {
    fetchBanners();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const fetchBanners = async () => {
    try {
      setLoading(true);
      // Use public banner service for user side
      const response = await bannerService.getAllBanners();
      // Handle both direct array and wrapped response formats
      const bannersData = response.data?.value || response.data || response || [];
      const activeBanners = bannersData
        .filter(banner => banner.is_active)
        .sort((a, b) => a.order_position - b.order_position);
      setBanners(activeBanners.length > 0 ? activeBanners : defaultBanners);
    } catch (error) {
      console.error('Error fetching banners:', error);
      // Always fallback to default banners on error
      setBanners(defaultBanners);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000); // Auto-slide every 5 seconds
    return () => clearInterval(timer);
  }, [banners.length]);
  const goToSlide = (index) => {
    setCurrentSlide(index);
  };
  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  };
  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  };
  const handleBannerClick = (banner) => {
    if (banner.link_url) {
      if (banner.link_url.startsWith('http')) {
        window.open(banner.link_url, '_blank');
      } else {
        // Check if it's a play-related link and add play mode
        if (banner.link_url === '/play' || banner.button_text === 'Play Now') {
          navigate('/home?mode=play');
        } else {
          navigate(banner.link_url);
        }
      }
    }
  };
  if (loading) {
    return (
      <div className="mb-4 h-32 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
        <div className="text-gray-500">Loading banners...</div>
      </div>
    );
  }
  if (banners.length === 0) {
    return (
      <div className="mb-4 h-32 bg-red-100 rounded-lg flex items-center justify-center">
        <div className="text-red-500">No banners found</div>
      </div>
    );
  }
  return (
    <div className="relative">
      <div className="relative h-32 overflow-hidden">
        {/* Banner Slides */}
        <div className="relative h-full">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-500 cursor-pointer ${
                index === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              onClick={() => handleBannerClick(banner)}
            >
              {banner.image_url ? (
                <div className="relative h-full">
                  <img 
                    src={banner.image_url} 
                    alt={banner.title || 'Banner'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  {/* Only show overlay if there's text content */}
                  {(banner.title || banner.description || banner.button_text) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent">
                      <div className="h-full flex items-center px-6">
                        <div>
                          {banner.title && (
                            <h3 
                              className="text-lg font-bold mb-1"
                              style={{ color: banner.text_color || '#FFFFFF' }}
                            >
                              {banner.title}
                            </h3>
                          )}
                          {banner.description && (
                            <p 
                              className="text-sm opacity-90"
                              style={{ color: banner.text_color || '#FFFFFF' }}
                            >
                              {banner.description}
                            </p>
                          )}
                          {banner.button_text && banner.link_url && (
                            <button 
                              className="mt-2 px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
                              style={{ color: banner.text_color || '#FFFFFF' }}
                            >
                              {banner.button_text}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  className="h-full flex items-center px-6"
                  style={{ backgroundColor: banner.background_color || '#3B82F6' }}
                >
                  <div className="flex-1">
                    <h3 
                      className="text-lg font-bold mb-1"
                      style={{ color: banner.text_color || '#FFFFFF' }}
                    >
                      {banner.title}
                    </h3>
                    {banner.description && (
                      <p 
                        className="text-sm opacity-90"
                        style={{ color: banner.text_color || '#FFFFFF' }}
                      >
                        {banner.description}
                      </p>
                    )}
                  </div>
                  {banner.button_text && banner.link_url && (
                    <button 
                      className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
                      style={{ color: banner.text_color || '#FFFFFF' }}
                    >
                      {banner.button_text}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Navigation Arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/30 text-white rounded-full hover:bg-black/50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/30 text-white rounded-full hover:bg-black/50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
        {/* Dots Indicator */}
        {banners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(index);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  index === currentSlide 
                    ? 'bg-white w-4' 
                    : 'bg-white/50 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default BannerCarousel;
