
class VideoManager {

    constructor(){
        this.playersRef = new Map();
        this.currentlyPlayingVideoId = null;

        this.isMuted = false;
        
        // Store player info for sharing between screens
        this.sharedPlayerInfo = null;

        // Maximum number of video players to keep in memory
        // iOS has strict memory limits - exceeding them can crash/restart the device
        this.MAX_PLAYERS = 2;
    }

    // Check if an error is a released/deallocated player error (iOS specific)
    _isReleasedError(e) {
        const msg = e?.message || '';
        return msg.includes('released') || 
               msg.includes('NativeSharedObject') || 
               msg.includes('shared object') ||
               msg.includes('FunctionCallException');
    }

    // Helper to check if a player is valid and usable
    _isPlayerValid(player) {
        try {
            // Try to access a property - if player is released, this will throw
            return player && typeof player.playing !== 'undefined';
        } catch (e) {
            return false;
        }
    }

    // Safely remove a stale player from the map
    _removeStalePlayer(feedId) {
        this.playersRef.delete(feedId);
        if (this.currentlyPlayingVideoId === feedId) {
            this.currentlyPlayingVideoId = null;
        }
    }


    register(feedId, player) {
        if (player && this._isPlayerValid(player)){
            try {
                player.muted = this.isMuted;
                this.playersRef.set(feedId, player);
                // Evict oldest players if we exceed the limit (prevents memory explosion)
                this._evictOldPlayers();
            } catch(e) {
                // Player might be in invalid state, don't register
            }
        } 
    }

    // Remove oldest inactive players when exceeding MAX_PLAYERS
    _evictOldPlayers() {
        if (this.playersRef.size <= this.MAX_PLAYERS) return;
        
        const keysToRemove = [];
        for (const [id] of this.playersRef) {
            if (id === this.currentlyPlayingVideoId) continue; // Keep the active one
            keysToRemove.push(id);
            if (this.playersRef.size - keysToRemove.length <= this.MAX_PLAYERS) break;
        }
        
        for (const id of keysToRemove) {
            try {
                const player = this.playersRef.get(id);
                if (player) { try { player.pause(); } catch(e) {} }
            } catch(e) {}
            this.playersRef.delete(id);
        }
    }


    // Store player info before navigating to comment screen
    setSharedPlayer(feedId, player, videoUrl) {
        if (!player || !feedId) return;
        
        try {
            // Check if player is still valid
            if (!this._isPlayerValid(player) || player.status === 'error') {
                return;
            }
            
            let currentTime = 0;
            try {
                currentTime = player.currentTime || 0;
            } catch (e) {
                // Player may be released, use 0
            }
            
            this.sharedPlayerInfo = {
                feedId,
                player,
                videoUrl,
                currentTime,
                wasPlaying: player?.playing || false
            };
            
            // Pause the player in feeds (it will continue in comment screen)
            try { 
                player.pause(); 
            } catch (e) {
                // Player may be released, ignore
            }
        } catch (e) {
            if (this._isReleasedError(e)) {
                this.sharedPlayerInfo = null;
            }
        }
    }
    
    // Get shared player info in comment screen
    getSharedPlayer() {
        return this.sharedPlayerInfo;
    }
    
    // Clear shared player info when done
    clearSharedPlayer() {
        this.sharedPlayerInfo = null;
    }
    
    // Check if we have a shared player for a specific feed
    hasSharedPlayer(feedId) {
        return this.sharedPlayerInfo?.feedId === feedId;
    }

    // Store current playing video's info (called before navigating to comment screen)
    storeCurrentPlayingVideo() {
        if (this.currentlyPlayingVideoId) {
            const player = this.playersRef.get(this.currentlyPlayingVideoId);
            if (player) {
                try {
                    // Check if player is still valid
                    if (!this._isPlayerValid(player) || player.status === 'error') {
                        this._removeStalePlayer(this.currentlyPlayingVideoId);
                        return null;
                    }
                    
                    let currentTime = 0;
                    try {
                        currentTime = player.currentTime || 0;
                    } catch (e) {}
                    
                    this.sharedPlayerInfo = {
                        feedId: this.currentlyPlayingVideoId,
                        player,
                        currentTime,
                        wasPlaying: player?.playing || false
                    };
                    
                    // Pause the player
                    try { player.pause(); } catch (e) {}
                    
                    return this.currentlyPlayingVideoId;
                } catch (e) {
                    if (this._isReleasedError(e)) {
                        this._removeStalePlayer(this.currentlyPlayingVideoId);
                    }
                    return null;
                }
            }
        }
        return null;
    }



    unregister(feedId) {
        try {
            const player = this.playersRef.get(feedId);
            if (player) {
                // Don't call methods on player here, just remove from map
                this.playersRef.delete(feedId);
            }
        } catch (e) {
            // Player likely released, just remove from map
            this.playersRef.delete(feedId);
        }
        
        // Clear currently playing if this was it
        if (this.currentlyPlayingVideoId === feedId) {
            this.currentlyPlayingVideoId = null;
        }
    }


    singlePlay(){
        if (!this.currentlyPlayingVideoId) return;
        try {
            const video = this.playersRef.get(this.currentlyPlayingVideoId);
            if (video && this._isPlayerValid(video) && video.status === 'readyToPlay') {
                video.play();
            }
        } catch (e) {
            if (this._isReleasedError(e)) {
                this._removeStalePlayer(this.currentlyPlayingVideoId);
            }
        }
    }


    play(feedId) {
        try {
            const player = this.playersRef.get(feedId);
            if (player && this._isPlayerValid(player) && player.status === 'readyToPlay') {
                player.play();
                this.currentlyPlayingVideoId = feedId;
            }
        } catch (e) {
            if (this._isReleasedError(e)) {
                this._removeStalePlayer(feedId);
            }
        }
    }


    singlePause(){
        if (!this.currentlyPlayingVideoId) return;
        try {
            const video = this.playersRef.get(this.currentlyPlayingVideoId);
            if (video && this._isPlayerValid(video)) {
                video.pause();
            }
        } catch (e) {
            if (this._isReleasedError(e)) {
                this._removeStalePlayer(this.currentlyPlayingVideoId);
            }
        }
    }



    pause(feedId) {
        try {
            const video = this.playersRef.get(feedId);
            if (video && this._isPlayerValid(video)) {
                video.pause();
                if (this.currentlyPlayingVideoId === feedId) this.currentlyPlayingVideoId = null;
            }
        } catch (e) {
            if (this._isReleasedError(e)) {
                this._removeStalePlayer(feedId);
            }
        }
    }



    switchVideo(nextVideoId) {

        if (this.currentlyPlayingVideoId === null || this.currentlyPlayingVideoId === nextVideoId){
            this.play(nextVideoId);
            return;
        }

        this.pause(this.currentlyPlayingVideoId);
        this.play(nextVideoId);
    }


    toggleMute(){
        this.isMuted = !this.isMuted;

        // Iterate and clean up any stale players
        const staleIds = [];
        this.playersRef.forEach((player, feedId) => {
            try {
                if (this._isPlayerValid(player)) {
                    player.muted = this.isMuted;
                } else {
                    staleIds.push(feedId);
                }
            } catch (e) {
                if (this._isReleasedError(e)) {
                    staleIds.push(feedId);
                }
            }
        });
        staleIds.forEach(id => this._removeStalePlayer(id));
    }

    setMute(muteStatus){
        this.isMuted = muteStatus;
        
        // Update mute state on all registered players
        const staleIds = [];
        this.playersRef.forEach((player, feedId) => {
            try {
                if (player && this._isPlayerValid(player)) {
                    player.muted = muteStatus;
                } else if (player) {
                    staleIds.push(feedId);
                }
            } catch (e) {
                if (this._isReleasedError(e)) {
                    staleIds.push(feedId);
                }
            }
        });
        staleIds.forEach(id => this._removeStalePlayer(id));
    }
    getMute(){

        return this.isMuted;
    }

    
    getVideoPlayer(feedId){

        return this.playersRef.get(feedId) || null;
    }
    getAllVideoPlayers(){
        return Array.from(this.playersRef.values());
    }

    // Release all players to free memory when app goes to background
    releaseAll() {
        try {
            // Pause current video first
            if (this.currentlyPlayingVideoId) {
                const current = this.playersRef.get(this.currentlyPlayingVideoId);
                if (current) {
                    try { current.pause(); } catch(e) {}
                }
            }
            // Clear the map - this allows garbage collection of player instances
            this.playersRef.clear();
            this.currentlyPlayingVideoId = null;
            console.log('VideoManager: Released all players to free memory');
        } catch(e) {
            console.log('VideoManager releaseAll error:', e);
        }
    }

    // Get count of registered players (for debugging)
    getPlayerCount() {
        return this.playersRef.size;
    }

    // ── Playback position tracking (feed → post detail continuity) ─────────────
    // positionMs: milliseconds (expo-av); consumers convert to seconds for expo-video
    setPosition(feedId, positionMs) {
        if (!feedId || positionMs == null) return;
        if (!this._positions) this._positions = new Map();
        this._positions.set(feedId, positionMs);
    }

    getPosition(feedId) {
        return this._positions?.get(feedId) ?? 0;
    }

    clearPosition(feedId) {
        this._positions?.delete(feedId);
    }

}


// Export a single instance
export default new VideoManager();