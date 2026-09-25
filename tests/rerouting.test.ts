import { describe, expect, it } from 'vitest';
import { chooseRequestedOptions, isDifferentRoute } from '../services/routingService';
import type { Route } from '../types/navigation';
const a={latitude:33,longitude:-7}, b={latitude:33.01,longitude:-7}, c={latitude:33.02,longitude:-7};
const base: Route={id:'old',distance:2200,duration:300,geometry:[a,b,c],steps:[],tollFree:true,fuelLiters:1,trafficAvailable:true,alerts:[],fetchedAt:Date.now()};
describe('in-trip route changes', () => {
  it('recognizes the remaining old route even when its origin moved', () => {
    expect(isDifferentRoute({...base,id:'new',geometry:[{latitude:33.005,longitude:-7},b,c]},base)).toBe(false);
    expect(isDifferentRoute({...base,geometry:[a,{latitude:33.01,longitude:-7.01},c]},base)).toBe(true);
  });
  it('preserves the current route when no genuine alternative is offered', () => {
    const options=chooseRequestedOptions([], [base], {alternativeTo:base});
    expect(options.every(o => o.route === null)).toBe(true);
    expect(base.id).toBe('old');
  });
  it('strictly excludes toll violations for every mode when no tolls is requested', () => {
    const paid={...base,id:'paid',tollFree:false,duration:100,fuelLiters:0.5};
    expect(chooseRequestedOptions([paid],[paid],{tollPolicy:'avoid'}).every(o=>o.route===null)).toBe(true);
    expect(chooseRequestedOptions([paid],[base],{tollPolicy:'avoid'}).map(o=>o.route?.id)).toEqual(['old','old','old']);
  });
  it('allows switching from free to possibly paid without forcing a paid route', () => {
    const paid={...base,id:'paid',tollFree:false,duration:100,fuelLiters:0.5};
    expect(chooseRequestedOptions([paid],[base])[1]?.route?.id).toBe('old');
    expect(chooseRequestedOptions([paid],[base],{tollPolicy:'allow'})[1]?.route?.id).toBe('paid');
    expect(chooseRequestedOptions([],[base],{tollPolicy:'allow'})[0]?.route?.tollFree).toBe(true);
  });
});
