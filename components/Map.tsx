'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
  Line,
} from 'react-simple-maps'
import { scaleSequential } from 'd3-scale'
import { interpolateBlues } from 'd3-scale-chromatic'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Log } from '@/hooks/useLogs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLogs } from '@/hooks/useLogs'

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const INDIA_COORDINATES: [number, number] = [78.9629, 20.5937]
const US_COORDINATES: [number, number] = [-95.7129, 37.0902]
const NL_COORDINATES: [number, number] = [4.8952, 52.3702]
const SE_COORDINATES: [number, number] = [18.0686, 59.3293]

const FIXED_COORDINATES: { [key: string]: [number, number] } = {
  IN: INDIA_COORDINATES,
  US: US_COORDINATES,
  NL: NL_COORDINATES,
  SE: SE_COORDINATES,
}

interface MapProps {
  selectedUser?: User
}

export default function WorldMap({ selectedUser }: MapProps) {
  const { logs } = useLogs()
  const [countryCounts, setCountryCounts] = useState<{ [key: string]: number }>({})
  const [activeMarker, setActiveMarker] = useState<Log | null>(null)
  const [animationInProgress, setAnimationInProgress] = useState(false)
  const [markers, setMarkers] = useState<Log[]>([])
  const [currentMarkerIndex, setCurrentMarkerIndex] = useState(-1)
  const animationRef = useRef<number | null>(null)

  const colorScale = useMemo(
    () =>
      scaleSequential(interpolateBlues).domain([
        0,
        Math.max(...Object.values(countryCounts)) || 1,
      ]),
    [countryCounts]
  )

  useEffect(() => {
    if (selectedUser) {
      const counts = selectedUser.logs.reduce((acc: { [key: string]: number }, log: Log) => {
        acc[log.countryCode] = (acc[log.countryCode] || 0) + 1
        return acc
      }, {})
      setCountryCounts(counts)
      setMarkers(selectedUser.logs)
    } else {
      const counts = logs.reduce((acc: { [key: string]: number }, log: Log) => {
        acc[log.countryCode] = (acc[log.countryCode] || 0) + 1
        return acc
      }, {})
      setCountryCounts(counts)
      setMarkers(logs)
    }
  }, [selectedUser, logs])

  const animateMarkers = () => {
    if (animationInProgress) {
      cancelAnimationFrame(animationRef.current || 0)
      setAnimationInProgress(false)
      setCurrentMarkerIndex(-1)
      return
    }

    setAnimationInProgress(true)
    let index = 0

    const animate = () => {
      if (index < markers.length) {
        setCurrentMarkerIndex(index)
        setActiveMarker(markers[index])
        index++
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setAnimationInProgress(false)
        setCurrentMarkerIndex(-1)
      }
    }

    animate()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login Locations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] w-full">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 100 }}
          >
            <ZoomableGroup center={[0, 10]} zoom={1}>
              <Geographies geography={geoUrl}>
                {({ geographies }: { geographies: { rsmKey: string; properties: { ISO_A2: string } }[] }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={colorScale(countryCounts[geo.properties.ISO_A2] || 0)}
                      stroke="#000000"
                      strokeWidth={0.5}
                    />
                  ))
                }
              </Geographies>

              {/* Fixed markers */}
              {Object.entries(FIXED_COORDINATES).map(([countryCode, coordinates]) => (
                <Marker key={countryCode} coordinates={coordinates}>
                  <circle r={6} fill="#FF6B6B" stroke="#FFF" strokeWidth={2} />
                </Marker>
              ))}

              <AnimatePresence>
                {markers.slice(0, currentMarkerIndex + 1).map((marker, index) => {
                  const startCoordinates = FIXED_COORDINATES[marker.countryCode];
                  return (
                    <motion.g
                      key={`${marker.ip}-${index}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Marker coordinates={[marker.longitude, marker.latitude]}>
                        <circle r={4} fill="#4CAF50" stroke="#FFF" strokeWidth={2} />
                      </Marker>
                      {startCoordinates && (
                        <Line
                          from={startCoordinates}
                          to={[marker.longitude, marker.latitude]}
                          stroke="#FF6B6B"
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                      )}
                    </motion.g>
                  );
                })}
              </AnimatePresence>
            </ZoomableGroup>
          </ComposableMap>
        </div>

        <Button
          onClick={animateMarkers}
          className="mt-4"
        >
          {animationInProgress ? 'Stop Animation' : 'Start Animation'}
        </Button>

        {activeMarker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg"
          >
            <h3 className="font-semibold">Login Details</h3>
            <p><strong>User:</strong> {activeMarker.name}</p>
            <p><strong>Email:</strong> {activeMarker.email}</p>
            <p><strong>Country:</strong> {activeMarker.countryCode}</p>
            <p><strong>IP Address:</strong> {activeMarker.ip}</p>
            <p><strong>Timestamp:</strong> {new Date(activeMarker.timestamp).toLocaleString()}</p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}

