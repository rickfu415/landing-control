import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const useLanguageStore = create(
  persist(
    (set) => ({
      language: 'zh', // 'en' or 'zh' - default to Chinese
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'falcon-lander-language', // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export default useLanguageStore

