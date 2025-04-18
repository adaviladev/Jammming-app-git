const clientId = '15e59b0df1884318a1388cc09b086097'; // Reemplaza con tu Client ID
const redirectUri = 'http://127.0.0.1:3000'; // Reemplaza con tu Redirect URI
let accessToken;
let userId; // Variable para almacenar el ID del usuario

const Spotify = {
  // Generar un code_verifier aleatorio
  generateCodeVerifier() {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(64);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => possible[byte % possible.length]).join('');
  },

  // Generar un code_challenge basado en el code_verifier
  async generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  },

  // Obtener el token de acceso desde el servidor de Spotify
  async getAccessToken() {
    if (accessToken) {
      console.log('Access Token:', accessToken);
      return accessToken;
    }

    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      try {
        const storedCodeVerifier = localStorage.getItem('code_verifier');
        if (!storedCodeVerifier) {
          throw new Error('Code verifier is missing from local storage.');
        }

        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: clientId,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            code_verifier: storedCodeVerifier,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error exchanging code for token:', errorData);
          throw new Error(`Failed to exchange code for token: ${response.status}`);
        }

        const data = await response.json();
        accessToken = data.access_token;
        console.log('Access Token:', accessToken);
        return accessToken;
      } catch (error) {
        console.error('Error exchanging code for token:', error);
      }
    } else {
      // Redirigir al usuario para obtener el código de autorización
      const codeVerifier = this.generateCodeVerifier();
      localStorage.setItem('code_verifier', codeVerifier); // Almacena el code_verifier
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);

      const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&code_challenge=${codeChallenge}&code_challenge_method=S256&scope=playlist-modify-public%20playlist-modify-private`;
      console.log('Redirecting to:', authUrl);
      window.location = authUrl;
    }
  },

  // Buscar canciones en Spotify
  async search(term) {
    const accessToken = await this.getAccessToken();
    const headers = { Authorization: `Bearer ${accessToken}` };

    console.log('Authorization Header:', headers);

    return fetch(`https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(term)}`, {
      headers: headers,
    })
      .then((response) => {
        console.log('Response Status:', response.status);
        if (!response.ok) {
          throw new Error('Failed to fetch search results');
        }
        return response.json();
      })
      .then((jsonResponse) => {
        if (!jsonResponse.tracks) {
          return [];
        }
        return jsonResponse.tracks.items.map((track) => ({
          id: track.id,
          name: track.name,
          artist: track.artists[0].name,
          album: track.album.name,
          uri: track.uri,
        }));
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  },

  // Guardar una lista de reproducción en Spotify
  async savePlaylist(name, trackURIs, id = null) {
    const accessToken = await this.getAccessToken();
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    const userId = await this.getCurrentUserId();

    if (id) {
      // Actualizar una lista de reproducción existente
      await fetch(`https://api.spotify.com/v1/users/${userId}/playlists/${id}`, {
        headers: headers,
        method: 'PUT',
        body: JSON.stringify({ name: name }),
      });

      return fetch(`https://api.spotify.com/v1/playlists/${id}/tracks`, {
        headers: headers,
        method: 'PUT',
        body: JSON.stringify({ uris: trackURIs }),
      });
    } else {
      // Crear una nueva lista de reproducción
      return fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        headers: headers,
        method: 'POST',
        body: JSON.stringify({ name: name, public: true }),
      }).then((response) => response.json());
    }
  },

  // Obtener el ID del usuario actual
  async getCurrentUserId() {
    if (userId) {
      return Promise.resolve(userId);
    }

    const accessToken = await this.getAccessToken();
    const headers = { Authorization: `Bearer ${accessToken}` };

    return fetch('https://api.spotify.com/v1/me', { headers: headers })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch user ID');
        }
        return response.json();
      })
      .then((jsonResponse) => {
        userId = jsonResponse.id;
        return userId;
      });
  },

  // Obtener las listas de reproducción del usuario
  async getUserPlaylists() {
    const accessToken = await this.getAccessToken();
    const headers = { Authorization: `Bearer ${accessToken}` };

    const userId = await this.getCurrentUserId();
    return fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, { headers: headers })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch playlists');
        }
        return response.json();
      })
      .then((jsonResponse) => {
        return jsonResponse.items.map((playlist) => ({
          id: playlist.id,
          name: playlist.name,
        }));
      });
  },
};

// Obtener una lista de reproducción por ID
Spotify.getPlaylist = async function (id) {
  const accessToken = await this.getAccessToken();
  const headers = { Authorization: `Bearer ${accessToken}` };

  return fetch(`https://api.spotify.com/v1/playlists/${id}`, { headers: headers })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch playlist');
      }
      return response.json();
    })
    .then((jsonResponse) => {
      return {
        name: jsonResponse.name,
        tracks: jsonResponse.tracks.items.map((item) => ({
          id: item.track.id,
          name: item.track.name,
          artist: item.track.artists[0].name,
          album: item.track.album.name,
          uri: item.track.uri,
        })),
      };
    });
};

export default Spotify;