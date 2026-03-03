export const FontFamily = {
  readexRegular: 'ReadexPro-Regular',
  readexMedium: 'ReadexPro-Medium',
  readexSemiBold: 'ReadexPro-SemiBold',
  readexBold: 'ReadexPro-Bold',

  workSansRegular: 'WorkSans-Regular',
  workSansMedium: 'WorkSans-Medium',
  workSansBold: 'WorkSans-Bold',

  shadowsIntoLight: 'ShadowsIntoLight-Regular',

  interRegular: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
  interBold: 'Inter_700Bold',
  interRegularItalic: 'Inter_400Regular_Italic',
  interMediumItalic: 'Inter_500Medium_Italic',
  interSemiBoldItalic: 'Inter_600SemiBold_Italic',

  outfitRegular: 'Outfit_400Regular',
  outfitMedium: 'Outfit_500Medium',
  outfitSemiBold: 'Outfit_600SemiBold',
} as const;

export const Typography = {
  h1: {
    fontFamily: FontFamily.readexBold,
    fontSize: 28,
    lineHeight: 34,
  },
  h2: {
    fontFamily: FontFamily.readexSemiBold,
    fontSize: 22,
    lineHeight: 28,
  },
  h3: {
    fontFamily: FontFamily.readexMedium,
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: FontFamily.readexRegular,
    fontSize: 16,
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: FontFamily.readexRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: FontFamily.readexRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    fontFamily: FontFamily.readexSemiBold,
    fontSize: 14,
    lineHeight: 20,
  },

  marketingHeadline: {
    fontFamily: FontFamily.workSansBold,
    fontSize: 32,
    lineHeight: 38,
  },
  marketingTagline: {
    fontFamily: FontFamily.shadowsIntoLight,
    fontSize: 22,
    lineHeight: 28,
  },
} as const;
