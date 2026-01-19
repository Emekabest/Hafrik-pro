

class ReelsManager {

    constructor(){
        this.playersRef = new Map();
        this.currentlyPlayingVideoId = null;

        this.isMuted = false;
    }


    register(feedId, player) {
        if (player){

            player.muted = this.isMuted;

            this.playersRef.set(feedId, player);
            // console.log("Registered video player for feedId:", feedId);

        } 
    }



    unregister(feedId) {
        this.playersRef.delete(feedId);
        // console.log("Unregistered video player for feedId:", feedId);

    }


    singlePlay(){
        if (!this.currentlyPlayingVideoId) return;
        const video = this.playersRef.get(this.currentlyPlayingVideoId);

        if (video && video.status === 'readyToPlay') {
            video.play();
        }
    }


    play(feedId) {
        
        const video = this.playersRef.get(feedId);

        if (video && video.status === 'readyToPlay') {

            video.play();   
            this.currentlyPlayingVideoId = feedId;
        }
    }



    singlePause(){
        if (!this.currentlyPlayingVideoId) return;
        const video = this.playersRef.get(this.currentlyPlayingVideoId);
        if (video) {
            video.pause();
        }
    }



    pause(feedId) {
        const video = this.playersRef.get(feedId);
        if (video) {
            video.pause();
            if (this.currentlyPlayingVideoId === feedId) this.currentlyPlayingVideoId = null;
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
    
        if (this.isMuted === false){
            this.isMuted = true; 
        }
        else if (this.isMuted === true){
            this.isMuted = false; 
        }

        const allPlayers = this.getAllVideoPlayers();
        allPlayers.forEach((player)=>{

            player.muted = this.isMuted;
        
        })
    
        
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

}


// Export a single instance
export default new ReelsManager();