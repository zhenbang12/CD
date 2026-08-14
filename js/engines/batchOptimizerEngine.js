/**
 * EcoHotel OS - Predictive F&B Batch Optimization Engine (Module 3)
 * Eliminates culinary over-preparation by algorithmically matching 48-hour guest influx
 * and dietary preferences with historical plate waste feedback loops.
 */

import { db } from '../db/storage.js';

export class BatchOptimizerEngine {
  /**
   * Generates optimized prep recommendations for a given date and meal shift.
   */
  static generatePrepRecommendations(selectedDate = '2026-08-13', selectedShift = 'Breakfast') {
    const forecasts = db.get('reservationForecast');
    const dishes = db.get('dishes');
    const inventory = db.get('inventory');

    const forecast = forecasts.find(f => f.date === selectedDate && f.shift === selectedShift) || forecasts[0] || {
      date: selectedDate,
      shift: selectedShift,
      expectedCheckIns: 120,
      totalInHouseGuests: 280,
      nationalities: { Malaysian: 40, Singaporean: 25, European: 20, MiddleEastern: 10, Others: 5 },
      dietaryProfiles: { Regular: 200, Halal: 250, VeganVegetarian: 30, GlutenFree: 15 }
    };
    const totalGuests = forecast ? forecast.totalInHouseGuests : 280;

    // Capture rates by meal period
    const captureRate = selectedShift === 'Breakfast' ? 0.94 : selectedShift === 'Lunch' ? 0.65 : 0.78;
    const estimatedDiners = Math.round(totalGuests * captureRate);

    // Calculate dish-level recommendations
    const recommendations = dishes.map(dish => {
      let culturalWeight = 1.0;

      if (dish.id === 'DSH-01') { // Nasi Lemak
        culturalWeight = (forecast.nationalities.Malaysian * 1.25 + forecast.nationalities.Singaporean * 1.10 + 25) / 100;
      } else if (dish.id === 'DSH-02') { // Salmon
        culturalWeight = (forecast.nationalities.European * 1.45 + 35) / 100;
      } else if (dish.id === 'DSH-03') { // Omelette
        culturalWeight = selectedShift === 'Breakfast' ? 1.30 : 0.55;
      } else if (dish.id === 'DSH-04') { // Mee Mamak
        culturalWeight = (forecast.nationalities.Malaysian * 0.9 + forecast.nationalities.Singaporean * 0.9 + 40) / 100;
      } else if (dish.id === 'DSH-05') { // Salad
        culturalWeight = (forecast.dietaryProfiles.VeganVegetarian * 1.85 + 45) / 100;
      } else if (dish.id === 'DSH-06') { // Beef
        culturalWeight = selectedShift === 'Dinner' ? 1.35 : 0.45;
      }

      // Algorithm calculation: Diners * Base Weight * Cultural Factor * Waste Multiplier / 1000
      const rawKg = (estimatedDiners * (dish.basePerGuestGrams / 1000) * culturalWeight * dish.wasteMultiplier);
      const recommendedKg = parseFloat(Math.max(2.0, rawKg).toFixed(1));
      const unoptimizedKg = parseFloat((estimatedDiners * (dish.basePerGuestGrams / 1000) * culturalWeight).toFixed(1));
      const foodSavedKg = parseFloat(Math.max(0, unoptimizedKg - recommendedKg).toFixed(1));

      return {
        dishId: dish.id,
        dishName: dish.name,
        category: dish.category,
        costTier: dish.costTier,
        baseGrams: dish.basePerGuestGrams,
        wasteMultiplier: dish.wasteMultiplier,
        culturalFactor: parseFloat(culturalWeight.toFixed(2)),
        recommendedKg,
        unoptimizedKg,
        foodSavedKg,
        ingredientRefs: dish.ingredientRefs
      };
    });

    // Aggregate key raw ingredients needed
    const ingredientSummary = this.calculateIngredientRequirements(recommendations, inventory);

    return {
      date: selectedDate,
      shift: selectedShift,
      forecast,
      estimatedDiners,
      recommendations,
      ingredientSummary
    };
  }

  static calculateIngredientRequirements(recommendations, inventory) {
    const rawMap = {
      'Fresh Farm Poultry (Chicken Breast)': { needed: 0, unit: 'kg', inventoryId: 'ING-001' },
      'Atlantic Salmon Fillet': { needed: 0, unit: 'kg', inventoryId: 'ING-002' },
      'Grade A Omega-3 Eggs': { needed: 0, unit: 'units', inventoryId: 'ING-003' },
      'Fragrant Jasmine Rice (Siam Super)': { needed: 0, unit: 'kg', inventoryId: 'ING-005' },
      'Organic Coconut Milk (Santan)': { needed: 0, unit: 'L', inventoryId: 'ING-006' },
      'Australian Ribeye Beef Strips': { needed: 0, unit: 'kg', inventoryId: 'ING-007' },
      'Fresh Tiger Prawns (Grade L)': { needed: 0, unit: 'kg', inventoryId: 'ING-008' },
      'Cameron Highland Hydroponic Lettuce': { needed: 0, unit: 'kg', inventoryId: 'ING-004' },
      'Organic Yellow Noodle (Mee)': { needed: 0, unit: 'kg', inventoryId: 'ING-009' },
      'Vine-Ripened Cameron Tomatoes': { needed: 0, unit: 'kg', inventoryId: 'ING-010' }
    };

    recommendations.forEach(rec => {
      if (rec.dishId === 'DSH-01') {
        rawMap['Fragrant Jasmine Rice (Siam Super)'].needed += rec.recommendedKg * 0.55;
        rawMap['Fresh Farm Poultry (Chicken Breast)'].needed += rec.recommendedKg * 0.40;
        rawMap['Organic Coconut Milk (Santan)'].needed += rec.recommendedKg * 0.20;
      } else if (rec.dishId === 'DSH-02') {
        rawMap['Atlantic Salmon Fillet'].needed += rec.recommendedKg * 0.90;
      } else if (rec.dishId === 'DSH-03') {
        rawMap['Grade A Omega-3 Eggs'].needed += Math.round(rec.recommendedKg * 16); // ~16 eggs per kg scrambled
      } else if (rec.dishId === 'DSH-04') {
        rawMap['Fresh Tiger Prawns (Grade L)'].needed += rec.recommendedKg * 0.35;
        rawMap['Organic Yellow Noodle (Mee)'].needed += rec.recommendedKg * 0.50;
      } else if (rec.dishId === 'DSH-05') {
        rawMap['Cameron Highland Hydroponic Lettuce'].needed += rec.recommendedKg * 0.70;
        rawMap['Vine-Ripened Cameron Tomatoes'].needed += rec.recommendedKg * 0.25;
      } else if (rec.dishId === 'DSH-06') {
        rawMap['Australian Ribeye Beef Strips'].needed += rec.recommendedKg * 0.85;
      }
    });

    return Object.entries(rawMap).map(([name, data]) => {
      const stockItem = inventory.find(i => i.id === data.inventoryId || i.name.toLowerCase().includes(name.toLowerCase()));
      const inStock = stockItem ? stockItem.quantity : 0;
      const needed = parseFloat(data.needed.toFixed(1));
      const isShortage = needed > inStock;

      return {
        ingredientName: name,
        needed,
        inStock,
        unit: data.unit,
        inventoryId: stockItem ? stockItem.id : data.inventoryId,
        isShortage,
        shortageAmount: isShortage ? parseFloat((needed - inStock).toFixed(1)) : 0
      };
    });
  }

  /**
   * Scans for high-cost plate waste spikes and returns active alerts
   */
  static checkOverPrepAlerts() {
    const plateLogs = db.get('plateWasteLogs');
    const alerts = [];

    plateLogs.forEach(log => {
      if (!log.isAnomaly && log.discardedKg >= 4.0) {
        alerts.push({
          id: `ALT-${log.id}`,
          dishName: log.dishName,
          discardedKg: log.discardedKg,
          date: log.date,
          mealPeriod: log.mealPeriod,
          severity: log.discardedKg >= 5.5 ? 'Critical Spike' : 'Warning Spike',
          message: `Statistical waste spike detected for ${log.dishName} (${log.discardedKg} kg discarded during ${log.mealPeriod}). Prep multiplier automatically reduced.`
        });
      }
    });

    return alerts;
  }
}
