import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Search from './pages/Search';
import MovieDetail from './pages/MovieDetail';
import PersonDetail from './pages/PersonDetail';
import Favorites from './pages/Favorites';
import { useFavorites } from './hooks/useFavorites';

export default function App() {
  const { favorites, isFavorite, toggleFavorite } = useFavorites();

  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main>
        <Routes>
          <Route
            path="/"
            element={
              <Home toggleFavorite={toggleFavorite} isFavorite={isFavorite} />
            }
          />
          <Route
            path="/search"
            element={
              <Search toggleFavorite={toggleFavorite} isFavorite={isFavorite} />
            }
          />
          <Route
            path="/movie/:id"
            element={
              <MovieDetail
                toggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
              />
            }
          />
          <Route
            path="/person/:id"
            element={
              <PersonDetail
                toggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
              />
            }
          />
          <Route
            path="/favorites"
            element={
              <Favorites
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
              />
            }
          />
        </Routes>
      </main>
      <Footer />
    </>
  );
}