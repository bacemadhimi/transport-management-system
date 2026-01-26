import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin, map, catchError } from 'rxjs';
import { InternalDailyForecast } from '../types/weather';



export interface WeatherData {
  location: string;
  temperature: number;
  feels_like: number;
  description: string;
  icon: string;
  humidity: number;
  wind_speed: number;
  precipitation?: number;
}

export interface DailyForecast {
  date: string;
  day: string;
  temperature_min: number;
  temperature_max: number;
  description: string;
  icon: string;
  precipitation_chance: number;
}



@Injectable({ providedIn: 'root' })
export class WeatherService {
  private apiKey = 'aacff7d0d86c768bc724481f653d95c2';
  private baseUrl = '/api'; 

  private cache = new Map<string, { data: any; time: number }>();
  private cacheDuration = 30 * 60 * 1000;

  constructor(private http: HttpClient) {}

 

  getWeatherByCity(city: string): Observable<WeatherData | null> {
    const cached = this.cache.get(city);
    if (cached && Date.now() - cached.time < this.cacheDuration) {
      return of(cached.data);
    }

   
    const url = `${this.baseUrl}/weather`;
    const params = {
      q: `${city},TN`,
      appid: this.apiKey,
      units: 'metric',
      lang: 'fr'
    };

    return this.http.get<any>(url, { params }).pipe(
      map(res => {
        const data = this.transformWeatherData(res, city);
        this.cache.set(city, { data, time: Date.now() });
        return data;
      }),
      catchError(err => {
        console.error('Weather error:', err);
        return of(this.getMockWeatherData(city));
      })
    );
  }



  getWeatherByCoords(
    lat: number,
    lon: number,
    location: string
  ): Observable<WeatherData | null> {
    const key = `${lat},${lon}`;
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.time < this.cacheDuration) {
      return of(cached.data);
    }


    const url = `${this.baseUrl}/weather`;
    const params = {
      lat: lat.toString(),
      lon: lon.toString(),
      appid: this.apiKey,
      units: 'metric',
      lang: 'fr'
    };

    return this.http.get<any>(url, { params }).pipe(
      map(res => {
        const data = this.transformWeatherData(res, location);
        this.cache.set(key, { data, time: Date.now() });
        return data;
      }),
      catchError(err => {
        console.error('Coords error:', err);
        return of(this.getMockWeatherData(location));
      })
    );
  }

 

  getWeatherForecast(city: string): Observable<DailyForecast[] | null> {
   
    const url = `${this.baseUrl}/forecast`;
    const params = {
      q: city,
      appid: this.apiKey,
      units: 'metric',
      lang: 'fr'
    };

    return this.http.get<any>(url, { params }).pipe(
      map(res => {
        if (!res?.list) return null;

        
        const dailyArray = this.groupForecastByDay(res.list) as InternalDailyForecast[];

        return dailyArray.map(d => ({
          date: d.date,
          day: this.getDayName(d.date),
          temperature_min: Math.round(d.temp_min),
          temperature_max: Math.round(d.temp_max),
          description: d.description,
          icon: d.icon,
          precipitation_chance: d.precipitation
        } as DailyForecast));
      }),
      catchError(err => {
        console.error('Forecast error:', err);
        return of(this.getMockForecastData());
      })
    );
  }



  getWeatherForLocations(start: string, end: string) {
    return forkJoin({
      start: this.getWeatherByCity(start),
      end: this.getWeatherByCity(end)
    });
  }

 

  private transformWeatherData(data: any, location: string): WeatherData {
    return {
      location,
      temperature: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      description: data.weather[0].description,
      icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
      humidity: data.main.humidity,
      wind_speed: Math.round(data.wind.speed * 3.6),
      precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0
    };
  }

  private groupForecastByDay(forecastList: any[]): InternalDailyForecast[] {
    const dailyData: Record<string, InternalDailyForecast> = {};

    forecastList.forEach(item => {
      const date = new Date(item.dt * 1000).toISOString().split('T')[0];

      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          temp_min: item.main.temp_min,
          temp_max: item.main.temp_max,
          description: item.weather[0]?.description ?? 'N/A',
          icon: item.weather[0]?.icon ?? '01d',
          precipitation: item.pop ?? 0
        };
      } else {
        dailyData[date].temp_min = Math.min(dailyData[date].temp_min, item.main.temp_min);
        dailyData[date].temp_max = Math.max(dailyData[date].temp_max, item.main.temp_max);
        dailyData[date].precipitation = Math.max(dailyData[date].precipitation, item.pop ?? 0);
      }
    });

    return Object.values(dailyData);
  }

  private getDayName(date: string): string {
    return ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][new Date(date).getDay()];
  }

  clearCache() {
    this.cache.clear();
  }

 

  private getMockWeatherData(city: string): WeatherData {
    return {
      location: city,
      temperature: 22,
      feels_like: 24,
      description: 'Ensoleillé',
      icon: 'https://openweathermap.org/img/wn/01d@2x.png',
      humidity: 55,
      wind_speed: 12,
      precipitation: 0
    };
  }

  private getMockForecastData(): DailyForecast[] {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu'];
    return days.map((d, i) => ({
      date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
      day: d,
      temperature_min: 15 + i,
      temperature_max: 25 + i,
      description: 'Partiellement nuageux',
      icon: '02d',
      precipitation_chance: 0.2
    }));
  }
  
  getWeatherIconClass(iconCode: string): string {
    const iconMap: { [key: string]: string } = {
      '01d': 'wb_sunny', // clear sky day
      '01n': 'nights_stay', // clear sky night
      '02d': 'partly_cloudy_day', // few clouds day
      '02n': 'partly_cloudy_night', // few clouds night
      '03d': 'cloud', // scattered clouds
      '03n': 'cloud',
      '04d': 'cloud_queue', // broken clouds
      '04n': 'cloud_queue',
      '09d': 'rainy', // shower rain
      '09n': 'rainy',
      '10d': 'rainy', // rain
      '10n': 'rainy',
      '11d': 'thunderstorm', // thunderstorm
      '11n': 'thunderstorm',
      '13d': 'ac_unit', // snow
      '13n': 'ac_unit',
      '50d': 'foggy', // mist
      '50n': 'foggy'
    };
    
    return iconMap[iconCode] || 'help_outline';
  }
}