import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon as IconifyIcon } from '@iconify/react'
import { format } from 'date-fns'
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  Badge,
  BadgeText,
  Box,
  Button,
  ButtonText,
  Card,
  Center,
  Heading,
  HStack,
  ScrollView,
  Tabs,
  TabsTab,
  TabsTabList,
  TabsTabPanel,
  TabsTabPanels,
  TabsTabTitle,
  Text,
  Toast,
  ToastDescription,
  ToastTitle,
  VStack,
  useToast,
} from '@gluestack-ui/themed'
import { useAppStore } from '@/store/useAppStore'
import type { COAlert } from '@/types'

type AlertTone = 'error' | 'warning' | 'info' | 'success'

interface SeverityMeta {
  label: string
  action: AlertTone
  icon: string
  accentBg: string
  accentColor: string
}

const severityMeta: Record<string, SeverityMeta> = {
  emergency: {
    label: 'Emergency',
    action: 'error',
    icon: 'mdi:alarm-light-outline',
    accentBg: '$backgroundLightError',
    accentColor: '#B91C1C',
  },
  critical: {
    label: 'Critical',
    action: 'error',
    icon: 'mdi:radiation',
    accentBg: '$backgroundLightError',
    accentColor: '#DC2626',
  },
  warning: {
    label: 'Warning',
    action: 'warning',
    icon: 'mdi:alert-circle-outline',
    accentBg: '$backgroundLightWarning',
    accentColor: '#CA8A04',
  },
  info: {
    label: 'Information',
    action: 'info',
    icon: 'mdi:information-outline',
    accentBg: '$backgroundLightInfo',
    accentColor: '#2563EB',
  },
  default: {
    label: 'Status',
    action: 'info',
    icon: 'mdi:help-circle-outline',
    accentBg: '$backgroundLightMuted',
    accentColor: '#1F2937',
  },
}

const getSeverityMeta = (level: string): SeverityMeta => {
  return severityMeta[level] ?? severityMeta.default
}

const Alerts: React.FC = () => {
  const { alerts, acknowledgeAlert, clearAlerts } = useAppStore()
  const toast = useToast()
  const cancelRef = useRef(null)

  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const activeAlerts = useMemo(() => alerts.filter(alert => !alert.acknowledged), [alerts])
  const acknowledgedAlerts = useMemo(() => alerts.filter(alert => alert.acknowledged), [alerts])

  const defaultTab = activeAlerts.length > 0 ? 'active' : 'history'
  const [tabValue, setTabValue] = useState<'active' | 'history'>(defaultTab)

  useEffect(() => {
    setTabValue(defaultTab)
  }, [defaultTab])

  const handleConfirmClear = useCallback(() => {
    clearAlerts()
    setIsConfirmOpen(false)
    toast.show({
      placement: 'top',
      duration: 3200,
      render: ({ id }) => (
        <Toast nativeID={id} action="info" variant="accent">
          <ToastTitle>Alerts cleared</ToastTitle>
          <ToastDescription>
            We removed all alert history. New events will appear here as soon as they arrive.
          </ToastDescription>
        </Toast>
      ),
    })
  }, [clearAlerts, toast])

  const handleAcknowledge = useCallback(
    (alertId: string, alertTitle: string) => {
      acknowledgeAlert(alertId)
      toast.show({
        placement: 'top',
        duration: 3000,
        render: ({ id }) => (
          <Toast nativeID={id} action="success" variant="accent">
            <ToastTitle>Alert archived</ToastTitle>
            <ToastDescription>{alertTitle} moved to history.</ToastDescription>
          </Toast>
        ),
      })
    },
    [acknowledgeAlert, toast],
  )

  const renderAlertCard = useCallback(
    (alert: COAlert, isActive: boolean) => {
      const severity = getSeverityMeta(alert.level)
      const timestamp = format(new Date(alert.timestamp), 'MMM d, h:mm a')

      return (
        <Card
          key={alert.id}
          variant="outline"
          size="md"
          borderColor="$borderLight200"
          bg="$backgroundLight0"
          borderRadius="$xl"
          p="$6"
        >
          <VStack space="xl">
            <HStack justifyContent="space-between" alignItems="flex-start" space="lg">
              <HStack space="md" alignItems="flex-start" flex={1}>
                <Box
                  bg={severity.accentBg}
                  borderRadius="$2xl"
                  p="$3"
                  justifyContent="center"
                  alignItems="center"
                  minWidth={52}
                  minHeight={52}
                >
                  <IconifyIcon icon={severity.icon} width={26} height={26} color={severity.accentColor} />
                </Box>
                <VStack space="sm" flex={1}>
                  <HStack space="sm" alignItems="center" flexWrap="wrap">
                    <Text size="lg" fontWeight="$semibold" color="$textLight900" flexShrink={1}>
                      {alert.title}
                    </Text>
                    <Badge
                      variant="solid"
                      action={severity.action}
                      borderRadius="$full"
                      px="$3"
                      py="$1"
                    >
                      <BadgeText size="xs" fontWeight="$bold">
                        {severity.label}
                      </BadgeText>
                    </Badge>
                  </HStack>
                  {alert.message && (
                    <Text size="sm" lineHeight="$md" color="$textLight600">
                      {alert.message}
                    </Text>
                  )}
                </VStack>
              </HStack>
              {isActive ? (
                <Button
                  variant="link"
                  action="primary"
                  size="sm"
                  onPress={() => handleAcknowledge(alert.id, alert.title)}
                  px="$2"
                >
                  <HStack space="xs" alignItems="center">
                    <IconifyIcon icon="solar:check-square-linear" width={18} height={18} />
                    <ButtonText fontWeight="$semibold">Archive</ButtonText>
                  </HStack>
                </Button>
              ) : (
                <Badge variant="outline" action="muted" size="sm" borderRadius="$full" px="$3">
                  <BadgeText size="xs">Acknowledged</BadgeText>
                </Badge>
              )}
            </HStack>
            <HStack justifyContent="space-between" alignItems="center">
              <Badge variant="outline" action="muted" borderRadius="$full" px="$3" py="$1">
                <HStack space="xs" alignItems="center">
                  <IconifyIcon icon="solar:clock-circle-linear" width={16} height={16} />
                  <BadgeText size="xs">Updated {timestamp}</BadgeText>
                </HStack>
              </Badge>
              {!isActive && (
                <Text size="xs" color="$textLight500" fontWeight="$medium">
                  Closed
                </Text>
              )}
            </HStack>
          </VStack>
        </Card>
      )
    },
    [handleAcknowledge],
  )

  if (alerts.length === 0) {
    return (
      <Center flex={1} bg="$backgroundLight0">
        <VStack space="md" alignItems="center">
          <Box p="$4" borderRadius="$full" bg="$backgroundLightSuccess">
            <IconifyIcon icon="mdi:check-decagram" width={28} height={28} color="#10B981" />
          </Box>
          <Heading size="md" textAlign="center">
            All systems are clear
          </Heading>
          <Text size="sm" textAlign="center" color="$textLight600" maxWidth={280}>
            Sensor readings are within your configured thresholds. We’ll notify you the moment
            anything changes.
          </Text>
        </VStack>
      </Center>
    )
  }

  return (
    <Box flex={1} bg="$backgroundLight50" _dark={{ bg: '$backgroundDark950' }}>
      <ScrollView
        flex={1}
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <VStack space="xl" px="$6" py="$6">
          <HStack justifyContent="space-between" alignItems="center">
            <VStack space="2xs">
              <Heading size="lg" color="$textLight900" _dark={{ color: '$textDark100' }}>
                Alerts
              </Heading>
              <Text size="sm" color="$textLight500" _dark={{ color: '$textDark400' }}>
                Review current incidents and archived history.
              </Text>
            </VStack>
            {alerts.length > 0 && (
              <Button
                variant="outline"
                action="secondary"
                size="sm"
                onPress={() => setIsConfirmOpen(true)}
              >
                <HStack space="xs" alignItems="center">
                  <IconifyIcon icon="solar:trash-bin-2-linear" width={18} height={18} />
                  <ButtonText>Clear all</ButtonText>
                </HStack>
              </Button>
            )}
          </HStack>

          <Tabs value={tabValue}>
            <TabsTabList
              borderColor="$borderLight200"
              borderBottomWidth="$1"
              pb="$2"
              px="$1"
              _dark={{ borderColor: '$borderDark600' }}
            >
              <TabsTab value="active" onPress={() => setTabValue('active')}>
                <HStack
                  alignItems="center"
                  space="sm"
                  px="$4"
                  py="$2"
                  borderRadius="$xl"
                  bg={tabValue === 'active' ? '$backgroundLight0' : 'transparent'}
                  _dark={{ bg: tabValue === 'active' ? '$backgroundDark900' : 'transparent' }}
                  mr="$2"
                >
                  <TabsTabTitle>Active</TabsTabTitle>
                  <Badge
                    size="sm"
                    variant={tabValue === 'active' ? 'solid' : 'outline'}
                    action={tabValue === 'active' ? 'error' : 'muted'}
                    borderRadius="$full"
                    px="$2"
                  >
                    <BadgeText size="xs">{activeAlerts.length}</BadgeText>
                  </Badge>
                </HStack>
              </TabsTab>

              <TabsTab value="history" onPress={() => setTabValue('history')}>
                <HStack
                  alignItems="center"
                  space="sm"
                  px="$4"
                  py="$2"
                  borderRadius="$xl"
                  bg={tabValue === 'history' ? '$backgroundLight0' : 'transparent'}
                  _dark={{ bg: tabValue === 'history' ? '$backgroundDark900' : 'transparent' }}
                >
                  <TabsTabTitle>History</TabsTabTitle>
                  <Badge
                    size="sm"
                    variant={tabValue === 'history' ? 'solid' : 'outline'}
                    action="muted"
                    borderRadius="$full"
                    px="$2"
                  >
                    <BadgeText size="xs">{acknowledgedAlerts.length}</BadgeText>
                  </Badge>
                </HStack>
              </TabsTab>
            </TabsTabList>

            <TabsTabPanels mt="$4">
              <TabsTabPanel value="active">
                {activeAlerts.length > 0 ? (
                  <VStack space="lg">
                    {activeAlerts.map(alert => renderAlertCard(alert, true))}
                  </VStack>
                ) : (
                  <Card
                    variant="outline"
                    borderColor="$borderLight200"
                    bg="$backgroundLight0"
                    p="$5"
                    borderRadius="$lg"
                    _dark={{ bg: '$backgroundDark900', borderColor: '$borderDark600' }}
                  >
                    <VStack space="sm" alignItems="flex-start">
                      <Heading size="sm" color="$textLight900" _dark={{ color: '$textDark100' }}>
                        No active alerts
                      </Heading>
                      <Text size="sm" color="$textLight500" _dark={{ color: '$textDark400' }}>
                        Everything looks steady right now. If air quality drifts past your thresholds we will surface it here instantly.
                      </Text>
                    </VStack>
                  </Card>
                )}
              </TabsTabPanel>

              <TabsTabPanel value="history">
                {acknowledgedAlerts.length > 0 ? (
                  <VStack space="lg">
                    {acknowledgedAlerts.map(alert => renderAlertCard(alert, false))}
                  </VStack>
                ) : (
                  <Card
                    variant="outline"
                    borderColor="$borderLight200"
                    bg="$backgroundLight0"
                    p="$5"
                    borderRadius="$lg"
                    _dark={{ bg: '$backgroundDark900', borderColor: '$borderDark600' }}
                  >
                    <VStack space="sm" alignItems="flex-start">
                      <Heading size="sm" color="$textLight900" _dark={{ color: '$textDark100' }}>
                        History is empty
                      </Heading>
                      <Text size="sm" color="$textLight500" _dark={{ color: '$textDark400' }}>
                        As alerts are acknowledged they’ll be archived here automatically for quick reference.
                      </Text>
                    </VStack>
                  </Card>
                )}
              </TabsTabPanel>
            </TabsTabPanels>
          </Tabs>
        </VStack>
      </ScrollView>

      <AlertDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
      >
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogHeader>
            <Heading size="md">Clear all alerts?</Heading>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text size="sm" color="$textLight600">
              This will permanently remove your alert history. We recommend exporting a report if
              you need to keep a record before clearing.
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <HStack space="md">
              <Button
                variant="outline"
                action="secondary"
                size="sm"
                onPress={() => setIsConfirmOpen(false)}
                ref={cancelRef}
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button action="negative" size="sm" onPress={handleConfirmClear}>
                <HStack space="xs" alignItems="center">
                  <IconifyIcon icon="mdi:delete" width={16} height={16} />
                  <ButtonText>Clear history</ButtonText>
                </HStack>
              </Button>
            </HStack>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  )
}

export default Alerts
