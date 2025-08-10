import { type JwtUser } from "../types/user";

// This adds type safety to the context object 
// Also to avoid unexpected type errors that TS compiler would scream at you
export type AppBindings = {
    user?: JwtUser;
}