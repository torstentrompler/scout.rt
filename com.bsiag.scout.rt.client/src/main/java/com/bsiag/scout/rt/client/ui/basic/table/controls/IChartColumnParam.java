package com.bsiag.scout.rt.client.ui.basic.table.controls;

public interface IChartColumnParam {

  int AGGREGATION_COUNT = -1;
  int AGGREGATION_SUM = 1;
  int AGGREGATION_AVG = 2;

  int GROUP_BY_YEARS = 256;
  int GROUP_BY_MONTHS = 257;
  int GROUP_BY_WEEKDAYS = 258;

  int getColumnIndex();

  int getColumnModifier();

}
