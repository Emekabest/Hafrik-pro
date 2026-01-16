

class VideoManager {

    constructor(){
        this.playersRef = new Map();
        this.currentlyPlayingVideoId = null;
        
    }


    register(feedId, ref) {
        if (ref){

            this.playersRef.set(feedId, ref);
            console.log(`Registered video player for feedId: ${feedId}`);
        } 
    }



    unregister(feedId) {
        this.playersRef.delete(feedId);
        console.log(`Unregistering video player for feedId: ${feedId}`);

    }



    play(feedId) {
        const video = this.playersRef.get(feedId);

        if (video && video.status === 'readyToPlay') {

            console.log(`Playing video for feedId: ${feedId}`);
            video.play();   
            this.currentlyPlayingVideoId = feedId;
        }
    }


    singlePause(){
        console.log("Currently Paused Video Id: " + this.currentlyPlayingVideoId);
        if (!this.currentlyPlayingVideoId) return;
        const video = this.playersRef.get(this.currentlyPlayingVideoId);
        if (video) {
            video.pause();
        }
    }


    pause(feedId) {
        const video = this.playersRef.get(this.currentlyPlayingVideoId);
        if (video) {
            video.pause();
            if (this.currentlyPlayingVideoId === feedId) this.currentlyPlayingVideoId = null;
        }
    }



    switchVideo(nextVideoId) {

        // if (this.currentlyPlayingVideoId === nextVideoId) {

        //     this.play(nextVideoId);
        //     return;
        // }; // already playing


        if (this.currentlyPlayingVideoId === null || this.currentlyPlayingVideoId === nextVideoId){
            this.play(nextVideoId);
            return;
        }

        this.pause(this.currentlyPlayingVideoId);
        this.play(nextVideoId);
    }

    getVideoPlayer(feedId){

        return this.playersRef.get(feedId) || null;
    }

}


// Export a single instance
export default new VideoManager();