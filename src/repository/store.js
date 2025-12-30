import { create } from 'zustand';


const store = create((set) => ({
    fonts: null,
    setFonts: (state)=> set({fonts: state}),

}));


export default store;