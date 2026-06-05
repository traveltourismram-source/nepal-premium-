import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy, Profile as FacebookProfile } from 'passport-facebook';
import { User } from '../db/models';
import { signAccessToken, generateRefreshToken, hashToken, refreshExpiresAt } from '../lib/jwt';
import { v4 as uuidv4 } from 'uuid';

// Serialize user into session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err as any, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: `${process.env.BACKEND_URL || 'http://localhost:4001'}/api/auth/google/callback`,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile: GoogleProfile, done) => {
      try {
        const email = profile.emails?.[0].value;
        if (!email) return done(new Error('No email from Google'), null);
        let user = await User.findOne({ email });
        if (!user) {
          // create new user record
          const id = uuidv4();
          user = new User({
            _id: id,
            first_name: profile.name?.givenName || '',
            last_name: profile.name?.familyName || '',
            email,
            password_hash: '', // password not used for OAuth
            avatar_seed: profile.displayName,
            google_id: profile.id,
            newsletter: 1,
          });
          await user.save();
        } else {
          // update google_id if missing
          if (!user.google_id) {
            user.google_id = profile.id;
            await user.save();
          }
        }
        return done(null, user);
      } catch (err) {
        return done(err as any, null);
      }
    }
  )
);

// Facebook OAuth Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID || '',
      clientSecret: process.env.FACEBOOK_APP_SECRET || '',
      callbackURL: `${process.env.BACKEND_URL || 'http://localhost:4001'}/api/auth/facebook/callback`,
      profileFields: ['id', 'emails', 'name', 'displayName'],
      enableProof: true,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile: FacebookProfile, done) => {
      try {
        const email = profile.emails?.[0].value;
        if (!email) return done(new Error('No email from Facebook'), null);
        let user = await User.findOne({ email });
        if (!user) {
          const id = uuidv4();
          user = new User({
            _id: id,
            first_name: profile.name?.givenName || '',
            last_name: profile.name?.familyName || '',
            email,
            password_hash: '',
            avatar_seed: profile.displayName,
            facebook_id: profile.id,
            newsletter: 1,
          });
          await user.save();
        } else {
          if (!user.facebook_id) {
            user.facebook_id = profile.id;
            await user.save();
          }
        }
        return done(null, user);
      } catch (err) {
        return done(err as any, null);
      }
    }
  )
);

export default passport;
