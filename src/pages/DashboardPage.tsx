import { useEffect, useState } from 'react';
import { DashboardSummary } from '../components/DashboardSummary';
import type { FoodLogDay } from '../models/foodLog';
import type { LocalFoodLogRepository } from '../repositories/LocalFoodLogRepository';
import { getLastNDates } from '../services/dateService';

interface DashboardPageProps {
  repository: LocalFoodLogRepository;
}

export function DashboardPage({ repository }: DashboardPageProps) {
  const [days, setDays] = useState<FoodLogDay[]>([]);
  const [status, setStatus] = useState('Loading dashboard...');

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        const recentDays = await repository.getRecentDays(7);

        if (isActive) {
          setDays(recentDays);
          setStatus(recentDays.length > 0 ? 'Last 7 days loaded.' : 'No saved days yet.');
        }
      } catch (error) {
        if (isActive) {
          setStatus(error instanceof Error ? error.message : 'Unable to load dashboard.');
        }
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, [repository]);

  const byDate = new Map(days.map((day) => [day.date, day]));

  return (
    <div className="page-stack">
      <DashboardSummary days={days} />

      <section className="panel">
        <div className="panel-title">
          <h2>Last 7 days</h2>
        </div>
        <p role="status" className="status">
          {status}
        </p>

        <div className="day-list">
          {getLastNDates(7).map((date) => {
            const day = byDate.get(date);
            const breakfast = day?.meals.find((meal) => meal.slot === 'breakfast');
            const lunch = day?.meals.find((meal) => meal.slot === 'lunch');
            const evening = day?.meals.find((meal) => meal.slot === 'evening-meal');
            const photoCount = day
              ? [...day.meals.map((meal) => meal.photoPath), ...day.snacks.map((snack) => snack.photoPath)].filter(
                  Boolean,
                ).length
              : 0;

            return (
              <article className="day-row" key={date}>
                <strong>{date}</strong>
                {day ? (
                  <dl>
                    <div>
                      <dt>Supplements</dt>
                      <dd>{day.supplements.morningSupplementsTaken ? 'Done' : 'Missed'}</dd>
                    </div>
                    <div>
                      <dt>Breakfast</dt>
                      <dd>{breakfast?.usedDefault ? 'Default' : 'Replaced'}</dd>
                    </div>
                    <div>
                      <dt>Lunch</dt>
                      <dd>{lunch?.usedDefault ? 'Default' : 'Replaced'}</dd>
                    </div>
                    <div>
                      <dt>Evening</dt>
                      <dd>{evening?.usedDefault ? 'Default' : 'Replaced'}</dd>
                    </div>
                    <div>
                      <dt>Snacks</dt>
                      <dd>{day.snacks.length}</dd>
                    </div>
                    <div>
                      <dt>Photos</dt>
                      <dd>{photoCount > 0 ? 'Yes' : 'No'}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="muted">No saved log.</p>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
