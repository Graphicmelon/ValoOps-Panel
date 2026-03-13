import {
  checkDatasetUpdateFromStaticData,
  getMapDashboardFromStaticData,
  getMapOptionsFromStaticData,
  getTeamMapOptionsFromStaticData,
  listMapsFromStaticData,
} from './staticQueryEngine'
import type {
  DashboardRequest,
  DashboardResponse,
  MapOptionsResponse,
  MapSummary,
  TeamMapObjectOptionsResponse,
} from './types'

export function listMaps(): Promise<MapSummary[]> {
  return listMapsFromStaticData()
}

export function getMapOptions(mapName: string): Promise<MapOptionsResponse> {
  return getMapOptionsFromStaticData(mapName)
}

export function getTeamMapOptions(
  mapName: string,
  teamSlug: string,
): Promise<TeamMapObjectOptionsResponse> {
  return getTeamMapOptionsFromStaticData(mapName, teamSlug)
}

export function getMapDashboard(
  mapName: string,
  payload: DashboardRequest,
): Promise<DashboardResponse> {
  return getMapDashboardFromStaticData(mapName, payload)
}

export function checkDatasetUpdate(): Promise<boolean> {
  return checkDatasetUpdateFromStaticData()
}
