import { Fragment, useState, useLayoutEffect } from "react";
import type { SVGAttributes, ReactNode } from "react";
import type { NextPage } from "next";
import { useQuery } from "react-query";
import {
  curveMonotoneX,
  extent,
  line,
  maxIndex,
  minIndex,
  scaleLinear,
  scaleOrdinal,
  scaleTime,
  schemeCategory10,
} from "d3";
import { Temporal } from "@js-temporal/polyfill";

import styles from "./[coordinates].module.css";

const getWeather = async () => {
  const response = await fetch("https://api.weather.gov/gridpoints/OKX/34,35");
  const body = await response.json();

  return body;
};

const cToF = (c: number): number => (c * 9) / 5 + 32;

type Point = { time: number; value: number; i: number };

type TimeSeries = { label: string; points: Point[] };

type DayBoundaries = Array<[number, number]>;

const getDayBoundaries = (
  startTime: number,
  endTime: number
): DayBoundaries => {
  const startDateTime =
    Temporal.Instant.fromEpochMilliseconds(startTime).toZonedDateTimeISO(
      "America/New_York"
    );

  const endDateTime =
    Temporal.Instant.fromEpochMilliseconds(endTime).toZonedDateTimeISO(
      "America/New_York"
    );

  const boundaries: DayBoundaries = [];
  let currentBoundary = startDateTime.startOfDay();

  while (
    endDateTime.epochMilliseconds - currentBoundary.epochMilliseconds >
    0
  ) {
    const boundaryStart = currentBoundary.epochMilliseconds;
    currentBoundary = currentBoundary.add("P1D");
    const boundaryEnd = currentBoundary.epochMilliseconds;
    boundaries.push([boundaryStart, boundaryEnd]);
  }

  return boundaries;
};

const getExtremePoints = (
  dayBoundaries: DayBoundaries,
  points: Point[]
): Point[] => {
  return dayBoundaries
    .map(([boundaryStart, boundaryEnd]) => {
      const pointsInBoundary = points.filter(
        (p) => p.time >= boundaryStart && p.time < boundaryEnd
      );

      return [
        pointsInBoundary[minIndex(pointsInBoundary, (d) => d.value)],
        pointsInBoundary[maxIndex(pointsInBoundary, (d) => d.value)],
      ];
    })
    .flat();
};

const getPointLabelPositioning = (
  { i, value: p }: Point,
  ps: Point[]
): {
  dx: number;
  dy: number;
  textAnchor?: SVGAttributes<SVGTextElement>["textAnchor"];
  alignmentBaseline?: SVGAttributes<SVGTextElement>["alignmentBaseline"];
} => {
  if (i === 0 || i === ps.length - 1) {
    return {
      dx: 0,
      dy: 0,
    };
  }

  const p0 = ps[i - 1].value;
  const p1 = ps[i + 1].value;

  if (p0 < p && p1 < p) {
    return {
      textAnchor: "middle",
      dx: 0,
      dy: -6,
    };
  }

  if (p0 > p && p1 > p) {
    return {
      textAnchor: "middle",
      alignmentBaseline: "hanging",
      dx: 0,
      dy: 6,
    } as const;
  }

  if (p0 < p && p1 > p) {
    return {
      textAnchor: "end",
      alignmentBaseline: "middle",
      dx: -6,
      dy: -6,
    } as const;
  }

  if (p0 > p && p1 < p) {
    return {
      textAnchor: "start",
      alignmentBaseline: "middle",
      dx: 6,
      dy: -6,
    } as const;
  }

  return {
    dx: 0,
    dy: 0,
  };
};

const Chart = ({ tss, height, width }: { tss: TimeSeries[] } & Dimensions) => {
  width = width < 1000 ? 1200 : width;

  const outerSpacing = { top: 0, right: 0, bottom: 18, left: 0 };
  const innerSpacing = { top: 20, right: 10, bottom: 20, left: 10 };

  const allTimes = tss.map((ts) => ts.points).flat();
  const allValues = tss.map((ts) => ts.points).flat();
  const xDomain = extent(allTimes, (d) => d.time) as [number, number];
  const yDomain = extent(allValues, (d) => d.value) as [number, number];

  const xScale = scaleTime()
    .domain(xDomain)
    .range([
      outerSpacing.left + innerSpacing.left,
      width - outerSpacing.left - outerSpacing.right - innerSpacing.right,
    ]);

  const yScale = scaleLinear()
    .domain(yDomain)
    .range([
      height - outerSpacing.top - outerSpacing.bottom - innerSpacing.bottom,
      outerSpacing.top + innerSpacing.top,
    ]);

  const pathGenerator = line<Point>()
    .curve(curveMonotoneX)
    .x((d) => xScale(d.time))
    .y((d) => yScale(d.value));

  const colorScale = scaleOrdinal<string>()
    .domain(tss.map((ts) => ts.label))
    .range(schemeCategory10);

  const dayBoundaries = getDayBoundaries(xDomain[0], xDomain[1]);
  const extremePointsByTs: { [tsLabel: string]: Point[] } = tss.reduce(
    (acc, ts) => ({
      ...acc,
      [ts.label]: getExtremePoints(dayBoundaries, ts.points),
    }),
    {}
  );

  const xTicks = dayBoundaries.map(([d0]) => d0);
  const yTicks = yScale.ticks(5);

  return (
    <svg className={styles.chart} width={width} height={height}>
      <line
        className={styles.chartAxis}
        x1={outerSpacing.left}
        x2={width - outerSpacing.left - outerSpacing.right}
        y1={height - outerSpacing.top - outerSpacing.bottom}
        y2={height - outerSpacing.top - outerSpacing.bottom}
      />
      <line
        className={styles.chartAxis}
        x1={outerSpacing.left}
        x2={width - outerSpacing.right - outerSpacing.left}
        y1={outerSpacing.top}
        y2={outerSpacing.top}
      />
      <line
        className={styles.chartAxis}
        x1={outerSpacing.left}
        x2={outerSpacing.left}
        y1={outerSpacing.top}
        y2={height - outerSpacing.top - outerSpacing.bottom}
      />
      <line
        className={styles.chartAxis}
        x1={width - outerSpacing.right - outerSpacing.left}
        x2={width - outerSpacing.right - outerSpacing.left}
        y1={outerSpacing.top}
        y2={height - outerSpacing.top - outerSpacing.bottom}
      />
      {xTicks.map((tick) => (
        <line
          key={tick.valueOf()}
          className={styles.chartTick}
          x1={xScale(tick)}
          x2={xScale(tick)}
          y1={outerSpacing.top}
          y2={height - outerSpacing.top - outerSpacing.bottom}
        />
      ))}
      {yTicks.map((tick) => (
        <Fragment key={tick}>
          <line
            key={tick}
            className={styles.chartTick}
            x1={outerSpacing.left}
            x2={width - outerSpacing.right - outerSpacing.left}
            y1={yScale(tick)}
            y2={yScale(tick)}
          />
        </Fragment>
      ))}
      {dayBoundaries.map(([t0, t1]) => {
        const dateTime =
          Temporal.Instant.fromEpochMilliseconds(t0).toZonedDateTimeISO(
            "America/New_York"
          );

        return (
          <text
            className={styles.xTickLabel}
            x={xScale(t0 + (t1 - t0) / 2)}
            y={height - 2}
          >
            {dateTime.month}/{dateTime.day}
          </text>
        );
      })}
      {tss.map((ts) => (
        <Fragment key={ts.label}>
          <path
            d={pathGenerator(ts.points)!}
            stroke={colorScale(ts.label)}
            strokeWidth="2"
            fill="none"
          ></path>
          {ts.points.map((p) => (
            <circle
              cx={xScale(p.time)}
              cy={yScale(p.value)}
              r="3"
              fill="white"
              stroke={colorScale(ts.label)}
              strokeWidth="2"
            ></circle>
          ))}
          {extremePointsByTs[ts.label].map((p) => {
            const { alignmentBaseline, textAnchor, dx, dy } =
              getPointLabelPositioning(p, ts.points);

            return (
              <text
                className={styles.pointLabel}
                x={xScale(p.time) + dx}
                y={yScale(p.value) + dy}
                fill={colorScale(ts.label)}
                alignmentBaseline={alignmentBaseline}
                textAnchor={textAnchor}
              >
                {Math.round(cToF(p.value))}º
              </text>
            );
          })}
        </Fragment>
      ))}
    </svg>
  );
};

const toPoints = (values: any[]) =>
  values.map(({ validTime, value }, i) => ({
    time: Date.parse(validTime.slice(0, validTime.indexOf("/"))),
    value,
    i,
  }));

type Dimensions = { width: number; height: number };

const AutoSizer = ({
  children,
}: {
  children: (d: Dimensions) => ReactNode;
}) => {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);

  useLayoutEffect(() => {
    if (!ref) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const [
        {
          contentRect: { width, height },
        },
      ] = entries;

      setDimensions({ width, height });
    });

    resizeObserver.observe(ref);

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return (
    <div style={{ width: "100%", height: "100%" }} ref={setRef}>
      {dimensions && children(dimensions)}
    </div>
  );
};

const LocationPage: NextPage = () => {
  const { isLoading, data } = useQuery("weather", getWeather);

  return isLoading ? (
    <div>"Loading..."</div>
  ) : (
    <div className={styles.page}>
      <AutoSizer>
        {(dimensions) => (
          <Chart
            {...dimensions}
            tss={[
              {
                label: "Temperature",
                points: toPoints(data.properties.temperature.values),
              },
              {
                label: "Dew Point",
                points: toPoints(data.properties.dewpoint.values),
              },
            ]}
          />
        )}
      </AutoSizer>
    </div>
  );
};

export default LocationPage;
