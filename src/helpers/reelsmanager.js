

class ReelsManager {

    constructor(){
        this.playersRef = new Map();
        this.currentlyPlayingVideoId = null;

        this.isMuted = false;

        // Maximum number of reel players to keep in memory
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

    // Safely remove a stale player from the map
    _removeStalePlayer(feedId) {
        this.playersRef.delete(feedId);
        if (this.currentlyPlayingVideoId === feedId) {
            this.currentlyPlayingVideoId = null;
        }
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

    // Remove oldest inactive players when exceeding MAX_PLAYERS
    _evictOldPlayers() {
        if (this.playersRef.size <= this.MAX_PLAYERS) return;
        
        const keysToRemove = [];
        for (const [id] of this.playersRef) {
            if (id === this.currentlyPlayingVideoId) continue;
            keysToRemove.push(id);
            if (this.playersRef.size - keysToRemove.length <= this.MAX_PLAYERS) break;
        }
        
        for (const id of keysToRemove) {
            try {
                const player = this.playersRef.get(id);
                if (player && this._isPlayerValid(player)) { try { player.pause(); } catch(e) {} }
            } catch(e) {}
            this.playersRef.delete(id);
        }
    }

    register(feedId, player) {
        if (player && this._isPlayerValid(player)){
            try {
                player.muted = this.isMuted;
                this.playersRef.set(feedId, player);
                this._evictOldPlayers();
            } catch(e) {
                // Player might be in invalid state, don't register
                console.log("Failed to register player for feedId:", feedId, e);
            }
        } 
    }



    unregister(feedId) {
        // If this was the currently playing video, clear that reference too
        if (this.currentlyPlayingVideoId === feedId) {
            this.currentlyPlayingVideoId = null;
        }
        this.playersRef.delete(feedId);
    }

    // Clear all registered players - useful when navigating away from reels
    clearAll() {
        this.playersRef.clear();
        this.currentlyPlayingVideoId = null;
    }


    singlePlay(){
        if (!this.currentlyPlayingVideoId) return;
        const video = this.playersRef.get(this.currentlyPlayingVideoId);

        if (video && this._isPlayerValid(video) && video.status === 'readyToPlay') {
            try {
                video.play();
            } catch(e) {
                console.log("Error in singlePlay:", e);
                // Player is invalid, remove it
                this.unregister(this.currentlyPlayingVideoId);
            }
        }
    }

    // Force replay the current video - useful when returning from screens that interfere with video playback
    forceReplay(feedId) {
        const video = this.playersRef.get(feedId);
        if (!video || !this._isPlayerValid(video)) {
            this.unregister(feedId);
            return false;
        }
        
        try {
            // Reset video position and play
            if (video.status === 'readyToPlay') {
                video.currentTime = video.currentTime; // Force a "refresh" of the player state
                video.play();
                this.currentlyPlayingVideoId = feedId;
                return true;
            }
        } catch(e) {
            console.log("Error in forceReplay:", e);
            this.unregister(feedId);
        }
        return false;
    }


    play(feedId) {
        
        const video = this.playersRef.get(feedId);

        if (video && this._isPlayerValid(video) && video.status === 'readyToPlay') {
            try{
                video.play();   
                this.currentlyPlayingVideoId = feedId;
            }
            catch(e){
                console.log("Error playing video for feedId:", feedId, e);
                this.unregister(feedId);
            }
        }
    }



    singlePause(){
        if (!this.currentlyPlayingVideoId) return;
        const video = this.playersRef.get(this.currentlyPlayingVideoId);
        if (video && this._isPlayerValid(video)) {
            try{
                video.pause();
            }
            catch(e){
                if (this._isReleasedError(e)) {
                    this._removeStalePlayer(this.currentlyPlayingVideoId);
                }
            }
        } else if (video) {
            // Player exists but is invalid, clean it up
            this._removeStalePlayer(this.currentlyPlayingVideoId);
        }
        // Note: We do NOT clear currentlyPlayingVideoId here so singlePlay can resume
    }


    // Pause any video by feedId, optionally clearing the currentlyPlayingVideoId
    pause(feedId, clearCurrent = true) {
        const video = this.playersRef.get(feedId);
        if (video) {
            try{
                if (this._isPlayerValid(video)) {
                    video.pause();
                } else {
                    this._removeStalePlayer(feedId);
                    return;
                }
            }
            catch(e){
                if (this._isReleasedError(e)) {
                    this._removeStalePlayer(feedId);
                    return;
                }
            }
            if (clearCurrent && this.currentlyPlayingVideoId === feedId) {
                this.currentlyPlayingVideoId = null;
            }
        }
    }


    // Pause the previous video immediately when switching, even if new video isn't ready
    switchVideo(nextVideoId) {
        try {
            // Always pause the current video first
            if (this.currentlyPlayingVideoId && this.currentlyPlayingVideoId !== nextVideoId) {
                const currentVideo = this.playersRef.get(this.currentlyPlayingVideoId);
                if (currentVideo) {
                    try {
                        if (this._isPlayerValid(currentVideo)) {
                            currentVideo.pause();
                        } else {
                            this._removeStalePlayer(this.currentlyPlayingVideoId);
                        }
                    } catch(e) {
                        if (this._isReleasedError(e)) {
                            this._removeStalePlayer(this.currentlyPlayingVideoId);
                        }
                    }
                }
            }

            // Update the target video ID regardless of whether it's ready
            this.currentlyPlayingVideoId = nextVideoId;

            // Try to play the new video (will only work if it's ready)
            const nextVideo = this.playersRef.get(nextVideoId);
            if (nextVideo && this._isPlayerValid(nextVideo) && nextVideo.status === 'readyToPlay') {
                nextVideo.play();
            }
        } catch(e) {
            if (this._isReleasedError(e)) {
                this._removeStalePlayer(nextVideoId);
            }
        }
    }

    toggleMute(){
        this.isMuted = !this.isMuted;

        const staleIds = [];
        this.playersRef.forEach((player, feedId) => {
            try {
                if (this._isPlayerValid(player)) {
                    player.muted = this.isMuted;
                } else {
                    staleIds.push(feedId);
                }
            } catch(e) {
                if (this._isReleasedError(e)) {
                    staleIds.push(feedId);
                }
            }
        });
        staleIds.forEach(id => this._removeStalePlayer(id));
    }

    setMute(muteStatus){
        this.isMuted = muteStatus;
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
            console.log('ReelsManager: Released all players to free memory');
        } catch(e) {
            console.log('ReelsManager releaseAll error:', e);
        }
    }

    // Get count of registered players (for debugging)
    getPlayerCount() {
        return this.playersRef.size;
    }

}


// Export a single instance
export default new ReelsManager();