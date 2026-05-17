import * as Clipboard from "expo-clipboard";
import { useRef, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View, type GestureResponderEvent } from "react-native";
import type { FriendPresence } from "@terri/shared";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Pill";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useFriendRequests } from "@/features/friends/hooks/useFriendRequests";
import { useFriendSearch } from "@/features/friends/hooks/useFriendSearch";
import { formatPresenceUpdatedAt } from "@/features/friends/presence";
import { styles } from "./HomeMapScreen.styles";

type FriendsModalProps = {
  friends: FriendPresence[];
  currentUserFriendCode?: string;
  onFriendsChange?: (friends: FriendPresence[]) => void;
  onClose: () => void;
};

const CLOSE_DRAG_DISTANCE = 72;

export function buildInviteUrl(friendCode?: string) {
  if (!friendCode) return "";
  return `https://terri.app/invite/${encodeURIComponent(friendCode)}`;
}

export function FriendsModal({ friends, currentUserFriendCode, onFriendsChange, onClose }: FriendsModalProps) {
  const dragStartYRef = useRef<number | undefined>(undefined);
  const inviteUrl = buildInviteUrl(currentUserFriendCode);
  const [inviteCopyMessage, setInviteCopyMessage] = useState<string | undefined>();
  const friendSearch = useFriendSearch();
  const friendRequests = useFriendRequests();
  const copyInviteUrl = () => {
    if (!inviteUrl) {
      setInviteCopyMessage("招待コードを読み込めませんでした");
      return;
    }
    void Clipboard.setStringAsync(inviteUrl)
      .then(() => setInviteCopyMessage("コピーしました"))
      .catch(() => setInviteCopyMessage("コピーできませんでした"));
  };
  const submitSearch = () => {
    void friendSearch.search();
  };
  const respondRequest = async (friendshipId: string, action: "accept" | "reject") => {
    const response = await friendRequests.respond(friendshipId, action);
    if (response.friends) {
      onFriendsChange?.(response.friends);
    }
  };
  const startCloseDrag = (event: GestureResponderEvent) => {
    dragStartYRef.current = event.nativeEvent.pageY;
  };
  const releaseCloseDrag = (event: GestureResponderEvent) => {
    const startY = dragStartYRef.current;
    dragStartYRef.current = undefined;
    if (startY === undefined) return;
    if (event.nativeEvent.pageY - startY >= CLOSE_DRAG_DISTANCE) {
      onClose();
    }
  };

  return (
    <View style={styles.modal}>
      <View style={styles.decorCoral} />
      <View style={styles.decorMint} />
      <View
        accessibilityLabel="友達画面を下に下げて閉じる"
        accessibilityRole="button"
        onResponderGrant={startCloseDrag}
        onResponderRelease={releaseCloseDrag}
        onStartShouldSetResponder={() => true}
        style={styles.modalDragHandleHitArea}
        testID="friends-drag-close-handle"
      >
        <View style={styles.modalDragHandle} />
      </View>
      <TouchableOpacity accessibilityLabel="友達画面を閉じる" accessibilityRole="button" hitSlop={12} onPress={onClose} style={styles.modalClose} testID="friends-close-button">
        <Text style={styles.modalCloseText}>×</Text>
      </TouchableOpacity>
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator testID="friends-scroll-view">
        <Text style={styles.modalTitle}>友達</Text>
        {friendRequests.incomingRequests.length > 0 ? (
          <View style={styles.friendRequestSection}>
            <Text style={styles.friendRequestSectionTitle}>届いた申請</Text>
            {friendRequests.incomingRequests.map((request) => {
              const disabled = friendRequests.respondingFriendshipId === request.friendshipId;
              return (
                <View key={request.friendshipId} style={styles.friendRequestRow}>
                  <Avatar initials={request.requester.initials} color={request.requester.color} size={52} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.friendSearchName}>{request.requester.displayName}</Text>
                    <Text style={styles.friendSearchCode}>{request.requester.friendCode}</Text>
                  </View>
                  <View style={styles.friendRequestActions}>
                    <TouchableOpacity
                      accessibilityLabel={`${request.requester.displayName}の友達申請を拒否`}
                      accessibilityRole="button"
                      disabled={disabled}
                      onPress={() => void respondRequest(request.friendshipId, "reject")}
                      style={[styles.friendRequestSmallButton, styles.friendRequestRejectButton, disabled ? styles.friendRequestButtonDisabled : null]}
                      testID={`friend-request-reject-${request.friendshipId}`}
                    >
                      <Text style={styles.friendRequestButtonText}>拒否</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityLabel={`${request.requester.displayName}の友達申請を承認`}
                      accessibilityRole="button"
                      disabled={disabled}
                      onPress={() => void respondRequest(request.friendshipId, "accept")}
                      style={[styles.friendRequestSmallButton, disabled ? styles.friendRequestButtonDisabled : null]}
                      testID={`friend-request-accept-${request.friendshipId}`}
                    >
                      <Text style={styles.friendRequestButtonText}>承認</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
        {friendRequests.outgoingRequests.length > 0 ? (
          <View style={styles.friendRequestSection}>
            <Text style={styles.friendRequestSectionTitle}>申請中</Text>
            <View style={styles.outgoingRequestList}>
              {friendRequests.outgoingRequests.slice(0, 3).map((request) => (
                <Pill key={request.friendshipId} tone="neutral">{`${request.receiver.displayName} 申請済み`}</Pill>
              ))}
            </View>
          </View>
        ) : null}
        {friendRequests.errorMessage ? <Text style={styles.friendSearchMessage}>{friendRequests.errorMessage}</Text> : null}
        <View style={styles.search}>
          <TextInput
            accessibilityLabel="ユーザーIDで検索"
            autoCapitalize="characters"
            onChangeText={friendSearch.setQuery}
            onSubmitEditing={submitSearch}
            placeholder="ユーザーIDで検索"
            placeholderTextColor="#9A9698"
            returnKeyType="search"
            style={styles.searchInput}
            testID="friends-search-input"
            value={friendSearch.query}
          />
          <TouchableOpacity accessibilityLabel="友達を検索" accessibilityRole="button" onPress={submitSearch} style={styles.searchAction} testID="friends-search-button">
            <Text style={styles.searchIcon}>⌕</Text>
          </TouchableOpacity>
        </View>
        {friendSearch.errorMessage ? <Text style={styles.friendSearchMessage}>{friendSearch.errorMessage}</Text> : null}
        {friendSearch.status === "success" && friendSearch.results.length === 0 ? <Text style={styles.friendSearchMessage}>該当するユーザーはいません</Text> : null}
        {friendSearch.results.map((result) => {
          const disabled = result.requestStatus !== "none" || friendSearch.requestingFriendCode === result.friendCode;
          const label = result.requestStatus === "accepted" ? "友達" : result.requestStatus === "pending" ? "申請済み" : "追加";
          return (
            <View key={result.id} style={styles.friendSearchRow}>
              <Avatar initials={result.initials} color={result.color} size={54} />
              <View style={{ flex: 1 }}>
                <Text style={styles.friendSearchName}>{result.displayName}</Text>
                <Text style={styles.friendSearchCode}>{result.friendCode}</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel={`${result.displayName}に友達申請`}
                accessibilityRole="button"
                disabled={disabled}
                onPress={() => void friendSearch.requestFriend(result.friendCode)}
                style={[styles.friendRequestButton, disabled ? styles.friendRequestButtonDisabled : null]}
                testID={`friend-request-${result.friendCode}`}
              >
                <Text style={styles.friendRequestButtonText} testID={`friend-request-label-${result.friendCode}`}>{label}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
        {friends.map((friend) => (
          <View key={friend.id} style={styles.friendRow}>
            <Avatar initials={friend.initials} color={friend.color} size={72} active={friend.isActive} />
            <View style={{ flex: 1 }}>
              <Text style={styles.friendName}>{friend.displayName}</Text>
              <View style={styles.friendPills}>
                <Pill>{friend.totalAreaKm2.toFixed(1)} km²</Pill>
                <Pill tone={friend.locationSharingEnabled ? "mint" : "neutral"}>{formatPresenceUpdatedAt(friend)}</Pill>
              </View>
            </View>
            <View style={styles.friendMap}>
              <Text style={{ fontSize: 30 }}>{friend.position ? "📍" : "…"}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.inviteTitle}>招待リンク</Text>
        <View style={styles.inviteBox}>
          <Text style={styles.inviteUrl}>{inviteUrl || "プロフィール読込中"}</Text>
          <TouchableOpacity accessibilityLabel="招待リンクをコピー" accessibilityRole="button" disabled={!inviteUrl} onPress={copyInviteUrl} style={[styles.copyButton, !inviteUrl ? styles.copyButtonDisabled : null]} testID="invite-copy-button">
            <Text style={styles.copyButtonText}>コピー</Text>
          </TouchableOpacity>
        </View>
        {inviteCopyMessage ? <Text style={styles.friendSearchMessage} testID="invite-copy-message">{inviteCopyMessage}</Text> : null}
        <PrimaryButton onPress={submitSearch} testID="friends-add-button">友達を検索</PrimaryButton>
      </ScrollView>
    </View>
  );
}
