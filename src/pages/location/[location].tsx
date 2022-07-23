import type { NextPage } from "next";
import { useQuery } from "react-query";

import { Chart } from "../../components/Chart";
import { AutoSizer } from "../../components/AutoSizer";
import type { TimeSeries } from "../../types";

import styles from "./[location].module.css";

type WeatherReport = {
  tss: {
    temperature: TimeSeries;
    dewpoint: TimeSeries;
  };
};

const toPoints = (values: any[]) =>
  values.map(({ validTime, value }, i) => ({
    time: Date.parse(validTime.slice(0, validTime.indexOf("/"))),
    value,
    i,
  }));

const getWeather = async (): Promise<WeatherReport> => {
  const response = await fetch("https://api.weather.gov/gridpoints/OKX/34,35");
  const body = await response.json();

  return {
    tss: {
      temperature: {
        label: "Temperature",
        points: toPoints(body.properties.temperature.values),
      },
      dewpoint: {
        label: "Dew Point",
        points: toPoints(body.properties.dewpoint.values),
      },
    },
  };

  return body;
};

const LocationPage: NextPage = () => {
  const weatherQuery = useQuery("weather", getWeather);

  // TODO: UV Index, Wind, Precipitation, Cloud Cover
  return weatherQuery.data ? (
    <div className={styles.page}>
      <AutoSizer>
        {({ width }) => (
          <>
            <h2 className={styles.header}>Temperature and dew point</h2>
            <Chart
              width={width}
              height={400}
              tss={Object.values(weatherQuery.data.tss)}
            />
          </>
        )}
      </AutoSizer>
    </div>
  ) : (
    <div>"Loading..."</div>
  );
};

export default LocationPage;
