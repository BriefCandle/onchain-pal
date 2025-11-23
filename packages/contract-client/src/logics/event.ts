import {
  Component,
  ComponentValue,
  getComponentValue,
  HasValue,
  runQuery,
} from "@latticexyz/recs";
import { ClientComponents, NetworkComponents } from "../mud";

export const getTokenAllEventsTexts = (
  components: NetworkComponents,
  tokenId: number
) => {
  // get all PathUpdated events for tokenId
  const pathUpdatedEvents = getAllEventValues(
    components,
    "PathUpdated",
    "tokenId",
    tokenId
  );
  // get all Attacked events for tokenId
  const attackerEvents = getAllEventValues(
    components,
    "Attacked",
    "attackerTokenId",
    tokenId
  );
  const attackedByEvents = getAllEventValues(
    components,
    "Attacked",
    "targetTokenId",
    tokenId
  );

  // get all HeroTalked events for heroId
  const talkedEvents = getAllEventValues(
    components,
    "Talked",
    "fromHeroId",
    tokenId
  );
  const talkedToEvents = getAllEventValues(
    components,
    "Talked",
    "toHeroId",
    tokenId
  );
  const captureAttemptedEvents = getAllEventValues(
    components,
    "CaptureAttempted",
    "targetTokenId",
    tokenId
  );
  return [
    ...pathUpdatedEvents,
    ...attackerEvents,
    ...attackedByEvents,
    ...captureAttemptedEvents,
    ...talkedEvents,
    ...talkedToEvents,
  ]
    .map((value) => getGameEventText(value))
    .filter((value) => value !== null)
    .sort((a, b) => (a as any)?.timestamp ?? 0 - ((b as any)?.timestamp ?? 0));
};

export const getAllEventValues = (
  components: NetworkComponents,
  eventName: EventComponentKeys,
  fieldName: string,
  fieldValue: number
) => {
  const eventComponent = components[
    `${eventName}Event` as keyof NetworkComponents
  ] as Component;
  const events = [
    ...runQuery([HasValue(eventComponent, { [fieldName]: fieldValue })]),
  ];
  const eventValues = events
    .map((event) => {
      const value = getComponentValue(eventComponent, event);
      if (!value) return null;
      return value;
    })
    .filter((value) => value !== null)
    .sort((a, b) => (a as any).timestamp - (b as any).timestamp);

  return eventValues;
};

export type EventComponentKeys =
  | "PathUpdated"
  | "Attacked"
  | "CaptureAttempted"
  | "CaptureSettled"
  | "Spawned"
  | "Revived"
  | "Defeated"
  | "Moved"
  | "Talked";

export const getGameEventText = (eventData: ComponentValue) => {
  // Return null if eventData doesn't exist or doesn't have eventType
  if (!eventData || !eventData.eventName) {
    return null;
  }

  const eventName = eventData.eventName as EventComponentKeys;

  // Return null if eventType is not a valid EventComponentKeys
  const validEventTypes: EventComponentKeys[] = [
    "PathUpdated",
    "Attacked",
    "CaptureAttempted",
    "CaptureSettled",
    "Spawned",
    "Revived",
    "Defeated",
    "Moved",
    "Talked",
  ];

  if (!validEventTypes.includes(eventName)) {
    return null;
  }
  switch (eventName) {
    case "Talked":
      return TalkedEventToText(
        eventData as ComponentValue<ClientComponents["TalkedEvent"]["schema"]>
      );
    case "Attacked":
      return AttackedEventToText(
        eventData as ComponentValue<ClientComponents["AttackedEvent"]["schema"]>
      );
    case "CaptureAttempted":
      return CaptureAttemptedEventToText(
        eventData as ComponentValue<
          ClientComponents["CaptureAttemptedEvent"]["schema"]
        >
      );
    case "CaptureSettled":
      return CaptureSettledEventToText(
        eventData as ComponentValue<
          ClientComponents["CaptureSettledEvent"]["schema"]
        >
      );
    case "Defeated":
      return DefeatedEventToText(
        eventData as ComponentValue<ClientComponents["DefeatedEvent"]["schema"]>
      );
    case "Revived":
      return RevivedEventToText(
        eventData as ComponentValue<ClientComponents["RevivedEvent"]["schema"]>
      );
    case "PathUpdated":
      return PathUpdatedEventToText(
        eventData as ComponentValue<
          ClientComponents["PathUpdatedEvent"]["schema"]
        >
      );
  }
};
export const TalkedEventToText = (
  value: ComponentValue<NetworkComponents["TalkedEvent"]["schema"]>
) => {
  const { fromTokenId, toTokenId, message, timestamp } = value;
  return `Token #${fromTokenId} talked to token #${toTokenId}: ${message} at ${timestamp}`;
};

export const AttackedEventToText = (
  value: ComponentValue<NetworkComponents["AttackedEvent"]["schema"]>
) => {
  const { attackerTokenId, targetTokenId, inRange, defeated, timestamp } =
    value;
  return `Token #${attackerTokenId} attacked token #${targetTokenId}: ${inRange ? "In range" : "Out of range"} ${defeated ? "Defeated" : "Not defeated"} at ${timestamp}`;
};

export const CaptureAttemptedEventToText = (
  value: ComponentValue<NetworkComponents["CaptureAttemptedEvent"]["schema"]>
) => {
  const { attackerTokenId, targetTokenId, inRange, timestamp } = value;
  return `Token #${attackerTokenId} attempted to capture token #${targetTokenId}: ${inRange ? "In range" : "Out of range"} at ${timestamp}`;
};

export const CaptureSettledEventToText = (
  value: ComponentValue<NetworkComponents["CaptureSettledEvent"]["schema"]>
) => {
  const { targetTokenId, playerAddress, caught, timestamp } = value;
  return `Token #${targetTokenId} was captured by ${playerAddress}?: ${caught ? "Yes, caught" : "No, not caught"} at ${timestamp}`;
};

export const DefeatedEventToText = (
  value: ComponentValue<NetworkComponents["DefeatedEvent"]["schema"]>
) => {
  const { tokenId, lastDeadTime, timestamp } = value;
  return `Token #${tokenId} was defeated at ${lastDeadTime} at ${timestamp}`;
};

export const RevivedEventToText = (
  value: ComponentValue<NetworkComponents["RevivedEvent"]["schema"]>
) => {
  const { tokenId, health, timestamp } = value;
  return `Token #${tokenId} was revived with ${health} health at ${timestamp}`;
};

export const PathUpdatedEventToText = (
  value: ComponentValue<NetworkComponents["PathUpdatedEvent"]["schema"]>
) => {
  const { tokenId, fromX, fromY, toX, toY, lastUpdated, duration } = value;
  return `Token #${tokenId} moved from (${fromX}, ${fromY}) to (${toX}, ${toY}) in ${duration} seconds at ${lastUpdated}`;
};
