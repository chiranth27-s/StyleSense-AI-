import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Highlights } from './components/Highlights';
import { Marketplace } from './components/Marketplace';
import { ProductDetailModal } from './components/ProductDetailModal';
import { AiStylistStudio } from './components/AiStylistStudio';
import { DigitalWardrobe } from './components/DigitalWardrobe';
import { LocalServices } from './components/LocalServices';
import { SellerStudio } from './components/SellerStudio';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { ServiceBookingModal } from './components/ServiceBookingModal';
import { AccountModal } from './components/AccountModal';
import { AuthModal } from './components/AuthModal';
import { ChatAssistant } from './components/ChatAssistant';
import { Footer } from './components/Footer';
import { ToastContainer, ToastItem } from './components/Toast';

import {
  supabase,
  getProfile,
  createOrderInSupabase,
  fetchUserOrders,
  createBookingInSupabase,
  fetchUserBookings
} from './lib/supabase';
import {
  DEFAULT_PRODUCTS,
  SERVICE_PROVIDERS,
  DEFAULT_WARDROBE,
  INITIAL_USER_PROFILE,
  INITIAL_ORDERS,
  INITIAL_BOOKINGS
} from './data/mockData';
import {
  Product,
  CartItem,
  WardrobeItem,
  ServiceProvider,
  Order,
  ServiceBooking,
  SavedOutfit,
  UserProfile,
  Occasion,
  StyleAesthetic,
  ColorPalette
} from './types';

export default function App() {
  // Navigation View: 'home' | 'stylist'
  const [currentView, setCurrentView] = useState<'home' | 'stylist'>('home');
  const [stylistSubTab, setStylistSubTab] = useState<'stylist' | 'builder'>('stylist');

  // App State with local storage persistence
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('stylesense_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('stylesense_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(() => {
    try {
      const saved = localStorage.getItem('stylesense_wardrobe');
      return saved ? JSON.parse(saved) : DEFAULT_WARDROBE;
    } catch {
      return DEFAULT_WARDROBE;
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('stylesense_orders');
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  const [bookings, setBookings] = useState<ServiceBooking[]>(() => {
    try {
      const saved = localStorage.getItem('stylesense_bookings');
      return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
    } catch {
      return INITIAL_BOOKINGS;
    }
  });

  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>(() => {
    try {
      const saved = localStorage.getItem('stylesense_saved_outfits');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('stylesense_user_profile');
      return saved ? JSON.parse(saved) : INITIAL_USER_PROFILE;
    } catch {
      return INITIAL_USER_PROFILE;
    }
  });

  // Authentication Modal State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authRedirectNotice, setAuthRedirectNotice] = useState<string | undefined>(undefined);

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [accountInitialTab, setAccountInitialTab] = useState('profile');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bookingProvider, setBookingProvider] = useState<ServiceProvider | null>(null);

  // Search input query & ref
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sync state to local storage
  useEffect(() => {
    try {
      localStorage.setItem('stylesense_cart', JSON.stringify(cart));
      localStorage.setItem('stylesense_wishlist', JSON.stringify(wishlist));
      localStorage.setItem('stylesense_wardrobe', JSON.stringify(wardrobe));
      localStorage.setItem('stylesense_orders', JSON.stringify(orders));
      localStorage.setItem('stylesense_bookings', JSON.stringify(bookings));
      localStorage.setItem('stylesense_saved_outfits', JSON.stringify(savedOutfits));
      localStorage.setItem('stylesense_user_profile', JSON.stringify(userProfile));
    } catch (e) {
      // Storage unavailable fallback
    }
  }, [cart, wishlist, wardrobe, orders, bookings, savedOutfits, userProfile]);

  // Sync Supabase Auth session & user profile
  const syncSupabaseUser = async (user: any) => {
    if (!user) return;

    let profileName = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'User');
    let profilePhone = user.user_metadata?.phone || '+91 98765 43210';
    let profileStyle: StyleAesthetic = (user.user_metadata?.preferred_style as StyleAesthetic) || 'Minimal';
    let profilePalette: ColorPalette = (user.user_metadata?.palette as ColorPalette) || 'Neutrals';
    let profileAddress = user.user_metadata?.address || '402, Lotus Residency, 12th Main, Indiranagar, Bengaluru - 560038';

    try {
      // Query profile from Supabase PostgreSQL profiles table
      const { data: dbProfile } = await getProfile(user.id);
      if (dbProfile) {
        if (dbProfile.name) profileName = dbProfile.name;
        if (dbProfile.phone) profilePhone = dbProfile.phone;
        if (dbProfile.preferredStyle) profileStyle = dbProfile.preferredStyle;
        if (dbProfile.palette) profilePalette = dbProfile.palette;
        if (dbProfile.addresses?.[0]?.text) profileAddress = dbProfile.addresses[0].text;
      }
    } catch {
      // If table is still pending creation, fallback to auth user_metadata
    }

    setUserProfile({
      id: user.id,
      name: profileName,
      email: user.email || '',
      phone: profilePhone,
      preferredStyle: profileStyle,
      palette: profilePalette,
      isAuthenticated: true,
      addresses: [
        { id: 'a1', label: 'Primary', text: profileAddress }
      ]
    });

    // Fetch user's orders from Supabase orders table
    try {
      const dbOrders = await fetchUserOrders(user.id);
      if (dbOrders && dbOrders.length > 0) {
        setOrders(dbOrders);
      }
    } catch {
      // Keep existing orders state
    }

    // Fetch user's care bookings from Supabase service_bookings table
    try {
      const dbBookings = await fetchUserBookings(user.id);
      if (dbBookings && dbBookings.length > 0) {
        setBookings(dbBookings);
      }
    } catch {
      // Keep existing bookings state
    }
  };

  useEffect(() => {
    // 1. Initial Session check from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncSupabaseUser(session.user);
      }
    });

    // 2. Real-time Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await syncSupabaseUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUserProfile({
          ...INITIAL_USER_PROFILE,
          isAuthenticated: false
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Deep linking via hash
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === '#stylist' || hash === '#stylist-studio') {
        setCurrentView('stylist');
        setStylistSubTab('stylist');
      } else if (hash === '#builder') {
        setCurrentView('stylist');
        setStylistSubTab('builder');
      } else {
        setCurrentView('home');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Navigation handlers
  const handleNavigate = (view: 'home' | 'stylist', subSection?: string) => {
    setCurrentView(view);
    if (view === 'stylist') {
      if (subSection === 'builder') {
        setStylistSubTab('builder');
      } else {
        setStylistSubTab('stylist');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (subSection) {
        setTimeout(() => {
          const el = document.getElementById(subSection);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleFocusSearch = () => {
    if (currentView !== 'home') {
      setCurrentView('home');
    }
    setTimeout(() => {
      const shopEl = document.getElementById('shop');
      if (shopEl) shopEl.scrollIntoView({ behavior: 'smooth' });
      searchInputRef.current?.focus();
    }, 100);
  };

  // Auth Modal openers & signout
  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin', notice?: string) => {
    setAuthMode(mode);
    setAuthRedirectNotice(notice);
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = async (authedProfile: UserProfile, message: string) => {
    setUserProfile(authedProfile);
    addToast(message);
    setIsAuthOpen(false);
    setAuthRedirectNotice(undefined);

    if (authedProfile.id) {
      try {
        const dbOrders = await fetchUserOrders(authedProfile.id);
        if (dbOrders && dbOrders.length > 0) {
          setOrders(dbOrders);
        }
      } catch {
        // Fallback
      }

      try {
        const dbBookings = await fetchUserBookings(authedProfile.id);
        if (dbBookings && dbBookings.length > 0) {
          setBookings(dbBookings);
        }
      } catch {
        // Fallback
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Fallback
    }
    setUserProfile({
      ...INITIAL_USER_PROFILE,
      isAuthenticated: false
    });
    setOrders(INITIAL_ORDERS);
    setBookings(INITIAL_BOOKINGS);
    addToast('You have been signed out successfully.');
  };

  // Cart operations
  const handleAddToCart = (product: Product, size?: string) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.id === product.id && item.selectedSize === size);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += 1;
        return next;
      }
      return [...prev, { ...product, quantity: 1, selectedSize: size }];
    });
    addToast(`Added "${product.name}" to shopping bag.`);
  };

  const handleAddMultipleToCart = (productsToAdd: Product[]) => {
    setCart(prev => {
      const next = [...prev];
      productsToAdd.forEach(p => {
        const existingIndex = next.findIndex(item => item.id === p.id);
        if (existingIndex > -1) {
          next[existingIndex].quantity += 1;
        } else {
          next.push({ ...p, quantity: 1 });
        }
      });
      return next;
    });
    addToast(`Added ${productsToAdd.length} coordinated pieces to shopping bag!`);
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.id === productId) {
            return { ...item, quantity: item.quantity + delta };
          }
          return item;
        })
        .filter(item => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
    addToast('Item removed from shopping bag.');
  };

  // Wishlist operations
  const handleToggleWishlist = (productId: string) => {
    setWishlist(prev => {
      const exists = prev.includes(productId);
      if (exists) {
        addToast('Removed piece from wishlist.');
        return prev.filter(id => id !== productId);
      }
      addToast('Saved piece to wishlist.');
      return [...prev, productId];
    });
  };

  // Wardrobe operations
  const handleAddWardrobeItem = (item: Omit<WardrobeItem, 'id'>) => {
    const newItem: WardrobeItem = {
      ...item,
      id: `w-${Date.now()}`
    };
    setWardrobe(prev => [newItem, ...prev]);
    addToast(`Added "${item.name}" to your closet.`);
  };

  const handleRemoveWardrobeItem = (id: string) => {
    setWardrobe(prev => prev.filter(w => w.id !== id));
    addToast('Item removed from closet.');
  };

  // Service Booking operations
  const handleConfirmBooking = async (bookingData: {
    serviceName: string;
    category: string;
    date: string;
    notes: string;
    address: string;
    serviceType: string;
    cost: string;
  }) => {
    const newBooking: ServiceBooking = {
      id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      serviceName: bookingData.serviceName,
      category: bookingData.category,
      date: bookingData.date,
      status: 'Confirmed Pickup',
      cost: bookingData.cost,
      notes: bookingData.notes,
      address: bookingData.address,
      serviceType: bookingData.serviceType
    };

    setBookings(prev => [newBooking, ...prev]);
    setBookingProvider(null);

    // Save care booking to Supabase service_bookings table
    let activeUserId = userProfile.id;
    if (!activeUserId) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        activeUserId = authData.user.id;
      }
    }

    if (activeUserId) {
      await createBookingInSupabase(activeUserId, {
        id: newBooking.id,
        serviceName: bookingData.serviceName,
        category: bookingData.category,
        date: bookingData.date,
        status: newBooking.status,
        cost: bookingData.cost,
        notes: bookingData.notes,
        address: bookingData.address
      });
      addToast(`Booking ${newBooking.id} confirmed and saved to Supabase!`);
    } else {
      addToast(`Booking ${newBooking.id} confirmed with ${bookingData.serviceName}!`);
    }
  };

  // Order placement
  const handlePlaceOrder = async (details: {
    address: string;
    recipientName: string;
    phone: string;
    paymentMethod: string;
  }) => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const newOrder: Order = {
      id: `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      total: subtotal,
      status: 'Confirmed & Processing',
      items: cart.map(i => `${i.name} (x${i.quantity})`)
    };

    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
    setIsCheckoutOpen(false);

    // Persist order in Supabase PostgreSQL 'orders' table
    let activeUserId = userProfile.id;
    if (!activeUserId) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        activeUserId = authData.user.id;
      }
    }

    if (activeUserId) {
      const { error } = await createOrderInSupabase(activeUserId, {
        id: newOrder.id,
        items: newOrder.items,
        total: newOrder.total,
        status: newOrder.status,
        shippingAddress: details.address,
        recipientName: details.recipientName,
        phone: details.phone
      });

      if (error) {
        console.error('Failed to save order to Supabase:', error);
        addToast(`Order placed. Supabase sync notice: ${error.message}`, 'error');
      } else {
        addToast(`Order ${newOrder.id} placed & recorded in Supabase!`);
      }
    } else {
      addToast(`Order ${newOrder.id} placed successfully!`);
    }

    setTimeout(() => {
      setAccountInitialTab('orders');
      setIsAccountOpen(true);
    }, 400);
  };

  // Saved Outfits
  const handleSaveOutfit = (outfit: { items: string[]; total: number; vibe: string }) => {
    const newSaved: SavedOutfit = {
      id: `OUTFIT-${Date.now()}`,
      date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      items: outfit.items,
      total: outfit.total,
      vibe: outfit.vibe
    };
    setSavedOutfits(prev => [newSaved, ...prev]);
    addToast('Ensemble saved to your personal account studio!');
  };

  // Save Style Profile
  const handleSaveProfile = (profile: {
    preferredStyle: StyleAesthetic;
    palette: ColorPalette;
    lastOccasion: Occasion;
  }) => {
    setUserProfile(prev => ({
      ...prev,
      preferredStyle: profile.preferredStyle,
      palette: profile.palette,
      lastOccasion: profile.lastOccasion
    }));
    addToast(`Saved ${profile.preferredStyle} style profile to your account!`);
  };

  const wishlistProducts = DEFAULT_PRODUCTS.filter(p => wishlist.includes(p.id));

  return (
    <div className="min-h-screen bg-[#fffefa] text-[#1a1c18] flex flex-col font-sans selection:bg-[#ecd5d0] selection:text-[#1a1c18]">
      
      {/* Universal Top Bar Header */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAccount={(tab) => {
          setAccountInitialTab(tab || 'profile');
          setIsAccountOpen(true);
        }}
        onOpenAuth={handleOpenAuth}
        onSignOut={handleSignOut}
        userProfile={userProfile}
        onFocusSearch={handleFocusSearch}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'home' ? (
          <>
            {/* Hero Section */}
            <Hero
              onExplore={() => handleNavigate('home', 'shop')}
              onFindStyle={() => handleNavigate('stylist')}
            />

            {/* Platform Highlights */}
            <Highlights
              onNavigateStylist={() => handleNavigate('stylist', 'stylist')}
              onNavigateBuilder={() => handleNavigate('stylist', 'builder')}
              onScrollServices={() => handleNavigate('home', 'services')}
            />

            {/* Marketplace Section */}
            <Marketplace
              products={DEFAULT_PRODUCTS}
              wishlistIds={wishlist}
              onToggleWishlist={handleToggleWishlist}
              onAddToCart={handleAddToCart}
              onSelectProduct={setSelectedProduct}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchRef={searchInputRef}
            />

            {/* Digital Wardrobe Section */}
            <DigitalWardrobe
              wardrobe={wardrobe}
              onAddWardrobeItem={handleAddWardrobeItem}
              onRemoveWardrobeItem={handleRemoveWardrobeItem}
              catalogProducts={DEFAULT_PRODUCTS}
              onAddToCart={handleAddToCart}
            />

            {/* Local Fashion Care Section */}
            <LocalServices
              providers={SERVICE_PROVIDERS}
              onBookService={(provider) => {
                setBookingProvider(provider);
              }}
            />

            {/* Seller Studio Preview Section */}
            <SellerStudio onNotify={addToast} />
          </>
        ) : (
          /* Dedicated AI Stylist & Complete Outfit Studio View */
          <AiStylistStudio
            products={DEFAULT_PRODUCTS}
            onBackToStore={() => handleNavigate('home')}
            onAddToCart={handleAddToCart}
            onAddMultipleToCart={handleAddMultipleToCart}
            onSaveOutfit={handleSaveOutfit}
            onSaveProfile={handleSaveProfile}
            initialSubTab={stylistSubTab}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenSellerStudio={() => {
          const sellerEl = document.getElementById('seller-preview');
          if (sellerEl) sellerEl.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenAccount={() => {
          setAccountInitialTab('profile');
          setIsAccountOpen(true);
        }}
        onNotify={addToast}
      />

      {/* Shopping Bag Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        onExplore={() => handleNavigate('home', 'shop')}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cart}
        userProfile={userProfile}
        onOpenAuth={(mode) => handleOpenAuth(mode, 'Please sign in to complete your checkout.')}
        onPlaceOrder={handlePlaceOrder}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        isWishlisted={selectedProduct ? wishlist.includes(selectedProduct.id) : false}
        onToggleWishlist={handleToggleWishlist}
      />

      {/* Local Care Service Booking Modal */}
      <ServiceBookingModal
        provider={bookingProvider}
        onClose={() => setBookingProvider(null)}
        onConfirmBooking={handleConfirmBooking}
        defaultAddress={userProfile.addresses[0]?.text || ''}
        userProfile={userProfile}
        onOpenAuth={(mode) => handleOpenAuth(mode, 'Please sign in to schedule fashion care.')}
      />

      {/* Customer Account Studio Modal */}
      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        initialTab={accountInitialTab}
        userProfile={userProfile}
        onUpdateProfile={(updated) => {
          setUserProfile(updated);
          addToast('Account profile preferences updated.');
        }}
        orders={orders}
        wishlistProducts={wishlistProducts}
        onAddToCart={handleAddToCart}
        bookings={bookings}
        savedOutfits={savedOutfits}
        onOpenAuth={(mode) => handleOpenAuth(mode)}
        onSignOut={handleSignOut}
      />

      {/* Supabase Authentication Modal (Login & Signup) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setAuthRedirectNotice(undefined);
        }}
        initialMode={authMode}
        onAuthSuccess={handleAuthSuccess}
        redirectNotice={authRedirectNotice}
      />

      {/* StyleSense AI Assistant Floating Chatbot */}
      <ChatAssistant
        products={DEFAULT_PRODUCTS}
        onSelectProduct={setSelectedProduct}
        onNavigateStylist={() => handleNavigate('stylist')}
      />

      {/* Toast Feedback Region */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

    </div>
  );
}
