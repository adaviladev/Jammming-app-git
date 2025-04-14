import React, { useState } from 'react';
import './App.module.css';
import SearchBar from '../SearchBar/SearchBar';
import SearchResults from '../SearchResults/SearchResults';
import Playlist from '../Playlist/Playlist';
import Spotify from '../../util/Spotify';

function App() {
  // Mock data for search results
  // In a real application, this would be fetched from an API
  const [searchResults, setSearchResults] = useState([
    { id: 1, name: 'Song 1', artist: 'Artist 1', album: 'Album 1' },
    { id: 2, name: 'Song 2', artist: 'Artist 2', album: 'Album 2' },
    { id: 3, name: 'Song 3', artist: 'Artist 3', album: 'Album 3' },
  ]);

  // State for the playlist
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [playlistName, setPlaylistName] = useState('New Playlist');

  // Function to add a track to the playlist
  const addTrack = (track) => {
    if (!playlistTracks.find((savedTrack) => savedTrack.id === track.id)) {
      setPlaylistTracks([...playlistTracks, track])
    }
  };

  const removeTrack = (track) => {
    setPlaylistTracks(playlistTracks.filter((savedTrack) => savedTrack.id !== track.id));
  };

  const updatePlaylistName = (name) => {
    setPlaylistName(name);
  }

  const savePlaylist = () => {
    const trackURIs = playlistTracks.map((track) => `spotify:track:${track.id}`);
    Spotify.savePlaylist(playlistName, trackURIs).then(() => {
      setPlaylistName('New Playlist');
      setPlaylistTracks([]);
    });
  };

  const searchSpotify = (term) => {
    Spotify.search(term).then((results) => {
      setSearchResults(results);
    });
  };

  return (
    <div className="App">
      <h1>Jammming</h1>
      <p>Discover and create playlists</p>
      <SearchBar onSearch={searchSpotify} />
      <SearchResults searchResults={searchResults} onAdd={addTrack} />
      <Playlist 
        playlistTracks={playlistTracks}
        playlistName={playlistName}
        onRemove={removeTrack}
        onNameChange={updatePlaylistName}
        onSave={savePlaylist}
      />
    </div>
  );
}

export default App;
